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
} from 'flipper';
import React, {useCallback, useState, useMemo, useEffect} from 'react';
import {List} from 'immutable';
import {SearchIndex} from 'algoliasearch';
import {SearchResponse} from '@algolia/client-search';
import {reportPlatformFailures, reportUsage} from '../../utils/metrics';
import restartFlipper from '../../utils/restartFlipper';
import {registerInstalledPlugins} from '../../reducers/pluginManager';
import {
  getPendingAndInstalledPlugins,
  removePlugin,
  PluginMap,
  PluginDetails,
} from 'flipper-plugin-lib';
import {
  provideSearchIndex,
  findPluginUpdates as _findPluginUpdates,
  UpdateResult,
} from '../../utils/pluginManager';
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
  installedPlugins: PluginMap;
};

type DispatchFromProps = {
  refreshInstalledPlugins: () => void;
};

type OwnProps = {
  searchIndexFactory: () => SearchIndex;
  autoHeight: boolean;
  findPluginUpdates: (
    currentPlugins: PluginMap,
  ) => Promise<[string, UpdateResult][]>;
};

type Props = OwnProps & PropsFromState & DispatchFromProps;

const defaultProps: OwnProps = {
  searchIndexFactory: provideSearchIndex,
  autoHeight: false,
  findPluginUpdates: _findPluginUpdates,
};

type UpdatablePlugin = {
  updateStatus: UpdateResult;
};

type UpdatablePluginDefinition = PluginDetails & UpdatablePlugin;

// exported for testing
export function annotatePluginsWithUpdates(
  installedPlugins: PluginMap,
  updates: Map<string, UpdateResult>,
): Map<string, UpdatablePluginDefinition> {
  const annotated: Array<[string, UpdatablePluginDefinition]> = Array.from(
    installedPlugins.entries(),
  ).map(([key, value]) => {
    const updateStatus = updates.get(key) || {kind: 'up-to-date'};
    return [key, {...value, updateStatus: updateStatus}];
  });
  return new Map(annotated);
}

const PluginInstaller = function (props: Props) {
  const [restartRequired, setRestartRequired] = useState(false);
  const [query, setQuery] = useState('');

  const onInstall = useCallback(async () => {
    props.refreshInstalledPlugins();
    setRestartRequired(true);
  }, []);

  const rows = useNPMSearch(
    query,
    setQuery,
    props.searchIndexFactory,
    props.installedPlugins,
    onInstall,
    props.findPluginUpdates,
  );
  const restartApp = useCallback(() => {
    restartFlipper();
  }, []);

  return (
    <>
      <Container>
        {restartRequired && (
          <RestartBar onClick={restartApp}>
            To activate this plugin, Flipper needs to restart. Click here to
            restart!
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
          autoHeight={props.autoHeight}
          rows={rows}
        />
      </Container>
      <PluginPackageInstaller onInstall={onInstall} />
    </>
  );
};
PluginInstaller.defaultProps = defaultProps;

const TableButton = styled(Button)({
  marginTop: 2,
});

const Spinner = styled(LoadingIndicator)({
  marginTop: 6,
});

const AlignedGlyph = styled(Glyph)({
  marginTop: 6,
});

function liftUpdatable(val: PluginDetails): UpdatablePluginDefinition {
  return {
    ...val,
    updateStatus: {kind: 'up-to-date'},
  };
}

function InstallButton(props: {
  name: string;
  version: string;
  onInstall: () => void;
  installed: boolean;
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
      : props.installed
      ? {kind: 'Remove'}
      : {kind: 'Install'},
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
  setQuery: (query: string) => void,
  searchClientFactory: () => SearchIndex,
  installedPlugins: PluginMap,
  onInstall: () => Promise<void>,
  findPluginUpdates: (
    currentPlugins: PluginMap,
  ) => Promise<[string, UpdateResult][]>,
): TableRows_immutable {
  const index = useMemo(searchClientFactory, []);

  useEffect(() => {
    reportUsage(`${TAG}:open`);
  }, []);

  const createRow = useCallback(
    (h: UpdatablePluginDefinition) => ({
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
              installed={installedPlugins.has(h.name)}
              updateStatus={h.updateStatus}
            />
          ),
          align: 'center' as 'center',
        },
      },
    }),
    [installedPlugins],
  );

  const [searchResults, setSearchResults] = useState<
    UpdatablePluginDefinition[]
  >([]);
  const [
    updateAnnotatedInstalledPlugins,
    setUpdateAnnotatedInstalledPlugins,
  ] = useState<Map<string, UpdatablePluginDefinition>>(new Map());

  useEffect(() => {
    (async () => {
      let cancelled = false;
      const {hits} = await reportPlatformFailures(
        index.search<PluginDetails>('', {
          query,
          filters: 'keywords:flipper-plugin',
          hitsPerPage: 20,
        }) as Promise<SearchResponse<PluginDetails>>,
        `${TAG}:queryIndex`,
      );
      if (cancelled) {
        return;
      }
      setSearchResults(
        hits
          .filter((hit) => !installedPlugins.has(hit.name))
          .map(liftUpdatable),
      );

      // Clean up: if query changes while we're searching, abandon results.
      return () => {
        cancelled = true;
      };
    })();
  }, [query, installedPlugins]);

  useEffect(() => {
    (async () => {
      const updates = new Map(await findPluginUpdates(installedPlugins));
      setUpdateAnnotatedInstalledPlugins(
        annotatePluginsWithUpdates(installedPlugins, updates),
      );
    })();
  }, [installedPlugins]);

  const results = Array.from(updateAnnotatedInstalledPlugins.values()).concat(
    searchResults,
  );
  return List(results.map(createRow));
}

export default connect<PropsFromState, DispatchFromProps, OwnProps, AppState>(
  ({pluginManager: {installedPlugins}}) => ({
    installedPlugins,
  }),
  (dispatch: Dispatch<Action<any>>) => ({
    refreshInstalledPlugins: () => {
      getPendingAndInstalledPlugins().then((plugins) =>
        dispatch(registerInstalledPlugins(plugins)),
      );
    },
  }),
)(PluginInstaller);
