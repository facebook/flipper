/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  FlexColumn,
  styled,
  ManagedTable_immutable,
  Toolbar,
  SearchInput,
  SearchBox,
  Button,
  colors,
  Spacer,
  TableRows_immutable,
  FlexRow,
  Glyph,
  Link,
  Text,
  LoadingIndicator,
  Tooltip,
} from '../../ui';
import React, {useCallback, useState, useEffect} from 'react';
import {List} from 'immutable';
import {reportPlatformFailures, reportUsage} from '../../utils/metrics';
import reloadFlipper from '../../utils/reloadFlipper';
import {registerInstalledPlugins} from '../../reducers/plugins';
import {
  UpdateResult,
  getInstalledPlugins,
  getUpdatablePlugins,
  removePlugin,
  UpdatablePluginDetails,
  InstalledPluginDetails,
} from 'flipper-plugin-lib';
import {installPluginFromNpm} from 'flipper-plugin-lib';
import {State as AppState} from '../../reducers';
import {connect} from 'react-redux';
import {Dispatch, Action} from 'redux';
import PluginPackageInstaller from './PluginPackageInstaller';

const TAG = 'PluginInstaller';

const EllipsisText = styled(Text)({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

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
    value: '',
  },
};

const Container = styled(FlexColumn)({
  height: 300,
  backgroundColor: colors.white,
  borderRadius: 4,
  overflow: 'hidden',
  border: `1px solid ${colors.macOSTitleBarButtonBorder}`,
});

const RestartBar = styled(FlexColumn)({
  backgroundColor: colors.red,
  color: colors.white,
  fontWeight: 500,
  padding: 10,
  cursor: 'pointer',
  textAlign: 'center',
});

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
    <>
      <Container>
        {restartRequired && (
          <RestartBar onClick={restartApp}>
            To apply the changes, Flipper needs to reload. Click here to reload!
          </RestartBar>
        )}
        <Toolbar>
          <SearchBox>
            <SearchInput
              onChange={(e) => setQuery(e.target.value)}
              value={query}
              placeholder="Search Flipper plugins..."
            />
          </SearchBox>
        </Toolbar>
        <ManagedTable_immutable
          rowLineHeight={28}
          floating={false}
          multiline={true}
          columnSizes={columnSizes}
          columns={columns}
          highlightableRows={false}
          highlightedRows={new Set()}
          autoHeight={autoHeight}
          rows={rows}
        />
      </Container>
      <PluginPackageInstaller onInstall={onInstall} />
    </>
  );
};

const TableButton = styled(Button)({
  marginTop: 2,
});

const Spinner = styled(LoadingIndicator)({
  marginTop: 6,
});

const AlignedGlyph = styled(Glyph)({
  marginTop: 6,
});

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

  const catchError = (
    actionKind: 'Install' | 'Remove' | 'Update',
    fn: () => Promise<void>,
  ) => async () => {
    try {
      await fn();
    } catch (err) {
      console.error(err);
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
    return <Spinner size={16} />;
  }
  if ((action.kind === 'Install' || action.kind === 'Remove') && action.error) {
  }
  const button = (
    <TableButton
      compact
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
    </TableButton>
  );

  if (action.error) {
    const glyph = (
      <AlignedGlyph color={colors.orange} size={16} name="caution-triangle" />
    );
    return (
      <FlexRow>
        <Tooltip
          options={{position: 'toLeft'}}
          title={`Something went wrong: ${action.error}`}
          children={glyph}
        />
        {button}
      </FlexRow>
    );
  } else {
    return button;
  }
}

function useNPMSearch(
  query: string,
  onInstall: () => void,
  installedPlugins: Map<string, InstalledPluginDetails>,
): TableRows_immutable {
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
            <EllipsisText>
              {h.name.replace(/^flipper-plugin-/, '')}
            </EllipsisText>
          ),
        },
        version: {
          value: <EllipsisText>{h.version}</EllipsisText>,
          align: 'flex-end' as 'flex-end',
        },
        description: {
          value: (
            <FlexRow grow>
              <EllipsisText>{h.description}</EllipsisText>
              <Spacer />
              <Link href={`https://yarnpkg.com/en/package/${h.name}`}>
                <Glyph color={colors.light20} name="info-circle" size={16} />
              </Link>
            </FlexRow>
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
      let cancelled = false;
      const updatablePlugins = await reportPlatformFailures(
        getUpdatablePlugins(query),
        `${TAG}:queryIndex`,
      );
      if (cancelled) {
        return;
      }
      setSearchResults(updatablePlugins);
      // Clean up: if query changes while we're searching, abandon results.
      return () => {
        cancelled = true;
      };
    })();
  }, [query, installedPlugins]);

  const rows: TableRows_immutable = List(searchResults.map(createRow));
  return rows;
}

PluginInstaller.defaultProps = defaultProps;

export default connect<PropsFromState, DispatchFromProps, OwnProps, AppState>(
  ({plugins: {installedPlugins}}) => ({
    installedPlugins,
  }),
  (dispatch: Dispatch<Action<any>>) => ({
    refreshInstalledPlugins: () => {
      getInstalledPlugins().then((plugins) =>
        dispatch(registerInstalledPlugins(plugins)),
      );
    },
  }),
)(PluginInstaller);
