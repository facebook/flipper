/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Layout, theme} from 'flipper-plugin';
import {LoadingIndicator, TableRows, ManagedTable, Glyph} from '../../ui';
import React, {useCallback, useState, useEffect} from 'react';
import {
  reportPlatformFailures,
  reportUsage,
  InstalledPluginDetails,
  UpdateResult,
  UpdatablePluginDetails,
} from 'flipper-common';
import reloadFlipper from '../../utils/reloadFlipper';
import {registerInstalledPlugins} from '../../reducers/plugins';
import {State as AppState} from '../../reducers';
import {connect} from 'react-redux';
import {Dispatch, Action} from 'redux';
import PluginPackageInstaller from './PluginPackageInstaller';
import {Toolbar} from 'flipper-plugin';
import {Alert, Button, Input, Tooltip, Typography} from 'antd';
import {WarningOutlined} from '@ant-design/icons';
import {getFlipperServer} from '../../flipperServer';

const {Text, Link} = Typography;

const TAG = 'PluginInstaller';

const columnSizes = {
  name: '25%',
  version: '10%',
  description: 'flex',
  install: '15%',
};

const columns = {
  name: {
    value: 'Name',
  },
  version: {
    value: 'Version',
  },
  description: {
    value: 'Description',
  },
  install: {
    value: 'Action',
  },
};

type PropsFromState = {
  installedPlugins: Map<string, InstalledPluginDetails>;
};

type DispatchFromProps = {
  refreshInstalledPlugins: () => void;
};

type OwnProps = {
  autoHeight: boolean;
};

type Props = OwnProps & PropsFromState & DispatchFromProps;

const defaultProps: OwnProps = {
  autoHeight: false,
};

const PluginInstaller = function ({
  refreshInstalledPlugins,
  installedPlugins,
  autoHeight,
}: Props) {
  const [restartRequired, setRestartRequired] = useState(false);
  const [query, setQuery] = useState('');

  const onInstall = useCallback(async () => {
    refreshInstalledPlugins();
    setRestartRequired(true);
  }, [refreshInstalledPlugins]);

  const rows = useNPMSearch(query, onInstall, installedPlugins);
  const restartApp = useCallback(() => {
    reloadFlipper();
  }, []);

  return (
    <Layout.Container gap height={500}>
      {restartRequired && (
        <Alert
          onClick={restartApp}
          type="error"
          message="To apply the changes, Flipper needs to reload. Click here to reload!"
          style={{cursor: 'pointer'}}
        />
      )}
      <Toolbar>
        <Input.Search
          onChange={(e) => setQuery(e.target.value)}
          value={query}
          placeholder="Search Flipper plugins..."
        />
      </Toolbar>
      <ManagedTable
        rowLineHeight={28}
        floating={false}
        multiline
        columnSizes={columnSizes}
        columns={columns}
        highlightableRows={false}
        highlightedRows={new Set()}
        autoHeight={autoHeight}
        rows={rows}
        horizontallyScrollable
      />
      <PluginPackageInstaller onInstall={onInstall} />
    </Layout.Container>
  );
};

function InstallButton(props: {
  name: string;
  version: string;
  onInstall: () => void;
  updateStatus: UpdateResult;
}) {
  type InstallAction =
    | {kind: 'Install'; error?: string}
    | {kind: 'Waiting'}
    | {kind: 'Remove'; error?: string}
    | {kind: 'Update'; error?: string};

  const catchError =
    (actionKind: 'Install' | 'Remove' | 'Update', fn: () => Promise<void>) =>
    async () => {
      try {
        await fn();
      } catch (err) {
        console.error(
          `Installation process of kind ${actionKind} failed with:`,
          err,
        );
        setAction({kind: actionKind, error: err.toString()});
      }
    };

  const mkInstallCallback = (action: 'Install' | 'Update') =>
    catchError(action, async () => {
      reportUsage(
        action === 'Install' ? `${TAG}:install` : `${TAG}:update`,
        undefined,
        props.name,
      );
      setAction({kind: 'Waiting'});

      await installPluginFromNpm(props.name);

      props.onInstall();
      setAction({kind: 'Remove'});
    });

  const performInstall = useCallback(mkInstallCallback('Install'), [
    props.name,
    props.version,
  ]);

  const performUpdate = useCallback(mkInstallCallback('Update'), [
    props.name,
    props.version,
  ]);

  const performRemove = useCallback(
    catchError('Remove', async () => {
      reportUsage(`${TAG}:remove`, undefined, props.name);
      setAction({kind: 'Waiting'});
      await removePlugin(props.name);
      props.onInstall();
      setAction({kind: 'Install'});
    }),
    [props.name],
  );

  const [action, setAction] = useState<InstallAction>(
    props.updateStatus.kind === 'update-available'
      ? {kind: 'Update'}
      : props.updateStatus.kind === 'not-installed'
      ? {kind: 'Install'}
      : {kind: 'Remove'},
  );

  if (action.kind === 'Waiting') {
    return <LoadingIndicator size={16} />;
  }
  if ((action.kind === 'Install' || action.kind === 'Remove') && action.error) {
  }
  const button = (
    <Button
      size="small"
      type={action.kind !== 'Remove' ? 'primary' : undefined}
      onClick={() => {
        switch (action.kind) {
          case 'Install':
            reportPlatformFailures(performInstall(), `${TAG}:install`);
            break;
          case 'Remove':
            reportPlatformFailures(performRemove(), `${TAG}:remove`);
            break;
          case 'Update':
            reportPlatformFailures(performUpdate(), `${TAG}:update`);
            break;
        }
      }}>
      {action.kind}
    </Button>
  );

  if (action.error) {
    const glyph = (
      <Glyph color={theme.warningColor} size={16} name="caution-triangle" />
    );
    return (
      <Layout.Horizontal gap>
        <Tooltip
          placement="leftBottom"
          title={`Something went wrong: ${action.error}`}
          children={glyph}
        />
        {button}
      </Layout.Horizontal>
    );
  } else {
    return button;
  }
}

function useNPMSearch(
  query: string,
  onInstall: () => void,
  installedPlugins: Map<string, InstalledPluginDetails>,
): TableRows {
  useEffect(() => {
    reportUsage(`${TAG}:open`);
  }, []);

  const [searchResults, setSearchResults] = useState<UpdatablePluginDetails[]>(
    [],
  );

  const createRow = useCallback(
    (h: UpdatablePluginDetails) => ({
      key: h.name,
      columns: {
        name: {
          value: (
            // Copy-paste from antd/Space. We cannot use Space directly as it wraps children with divs, and we cannot easily set styles fro the wrapper child divs.
            // Yet, we want to set min-width: 0 for the child with the Text. Otherwise, ellipsis does not work.
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                overflow: 'hidden',
                gap: theme.space.small,
              }}>
              {h.deprecated != null ? (
                <Tooltip title={h.deprecated || 'Plugin is deprecated'}>
                  <WarningOutlined style={{color: theme.errorColor}} />
                </Tooltip>
              ) : null}
              <Text style={{minWidth: 0}} ellipsis>
                {h.name.replace(/^flipper-plugin-/, '')}
              </Text>
            </div>
          ),
        },
        version: {
          value: <Text ellipsis>{h.version}</Text>,
          align: 'flex-end' as 'flex-end',
        },
        description: {
          value: (
            <Layout.Horizontal center gap>
              <Text ellipsis>{h.description}</Text>
              <Link href={`https://yarnpkg.com/en/package/${h.name}`}>
                <Glyph
                  color={theme.textColorActive}
                  name="info-circle"
                  size={16}
                />
              </Link>
            </Layout.Horizontal>
          ),
        },
        install: {
          value: (
            <InstallButton
              name={h.name}
              version={h.version}
              onInstall={onInstall}
              updateStatus={h.updateStatus}
            />
          ),
          align: 'center' as 'center',
        },
      },
    }),
    [onInstall],
  );

  useEffect(() => {
    (async () => {
      let canceled = false;
      const updatablePlugins = await reportPlatformFailures(
        getUpdatablePlugins(query),
        `${TAG}:queryIndex`,
      );
      if (canceled) {
        return;
      }
      setSearchResults(updatablePlugins);
      // Clean up: if query changes while we're searching, abandon results.
      return () => {
        canceled = true;
      };
    })();
  }, [query, installedPlugins]);

  const rows = searchResults.map(createRow);
  return rows;
}

PluginInstaller.defaultProps = defaultProps;

export default connect<PropsFromState, DispatchFromProps, OwnProps, AppState>(
  ({plugins: {installedPlugins}}) => ({
    installedPlugins,
  }),
  (dispatch: Dispatch<Action<any>>) => ({
    refreshInstalledPlugins: async () => {
      const plugins = await getFlipperServer().exec(
        'plugins-get-installed-plugins',
      );
      dispatch(registerInstalledPlugins(plugins));
    },
  }),
)(PluginInstaller);

async function installPluginFromNpm(
  name: string,
): Promise<InstalledPluginDetails> {
  return await getFlipperServer().exec('plugins-install-from-npm', name);
}

async function removePlugin(name: string) {
  return await getFlipperServer().exec('plugins-remove-plugins', [name]);
}

async function getUpdatablePlugins(query: string | undefined) {
  return await getFlipperServer().exec('plugins-get-updatable-plugins', query);
}
