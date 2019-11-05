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
import algoliasearch from 'algoliasearch';
import path from 'path';
import fs from 'fs-extra';
import {PluginManager as PM} from 'live-plugin-manager';
import {reportPlatformFailures, reportUsage} from '../utils/metrics';
import restartFlipper from '../utils/restartFlipper';
import {PluginMap, PluginDefinition} from '../reducers/pluginManager';
import {PLUGIN_DIR} from '../dispatcher/pluginManager';
import {State as AppState} from '../reducers';
import {connect} from 'react-redux';

const ALGOLIA_APPLICATION_ID = 'OFCNCOG2CU';
const ALGOLIA_API_KEY = 'f54e21fa3a2a0160595bb058179bfb1e';
const TAG = 'PluginInstaller';
const PluginManager = new PM({
  ignoredDependencies: ['flipper', 'react', 'react-dom', '@types/*'],
});

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

type OwnProps = {
  searchIndexFactory: () => algoliasearch.Index;
  autoHeight: boolean;
};

type Props = OwnProps & PropsFromState;

const defaultProps: Props = {
  searchIndexFactory: () => {
    const client = algoliasearch(ALGOLIA_APPLICATION_ID, ALGOLIA_API_KEY);
    return client.initIndex('npm-search');
  },
  installedPlugins: new Map(),
  autoHeight: false,
};

const PluginInstaller = function props(props: Props) {
  const [restartRequired, setRestartRequired] = useState(false);
  const [query, setQuery] = useState('');
  const rows = useNPMSearch(
    setRestartRequired,
    query,
    setQuery,
    props.searchIndexFactory,
    // TODO(T56693735): Refactor this to directly take props.
    async () => props.installedPlugins,
  );
  const restartApp = useCallback(() => {
    restartFlipper();
  }, []);

  return (
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
            onChange={e => setQuery(e.target.value)}
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

function InstallButton(props: {
  name: string;
  version: string;
  onInstall: () => void;
  installed: boolean;
}) {
  type InstallAction =
    | {kind: 'Install'; error?: string}
    | {kind: 'Waiting'}
    | {kind: 'Remove'; error?: string};

  const catchError = (
    actionKind: 'Install' | 'Remove',
    fn: () => Promise<void>,
  ) => async () => {
    try {
      await fn();
    } catch (err) {
      setAction({kind: actionKind, error: err.toString()});
    }
  };

  const performInstall = useCallback(
    catchError('Install', async () => {
      reportUsage(`${TAG}:install`, undefined, props.name);
      setAction({kind: 'Waiting'});
      await fs.ensureDir(PLUGIN_DIR);
      // create empty watchman config (required by metro's file watcher)
      await fs.writeFile(path.join(PLUGIN_DIR, '.watchmanconfig'), '{}');

      // install the plugin and all it's dependencies into node_modules
      PluginManager.options.pluginsPath = path.join(
        PLUGIN_DIR,
        props.name,
        'node_modules',
      );
      await PluginManager.install(props.name);

      // move the plugin itself out of the node_modules folder
      const pluginDir = path.join(
        PLUGIN_DIR,
        props.name,
        'node_modules',
        props.name,
      );
      const pluginFiles = await fs.readdir(pluginDir);
      await Promise.all(
        pluginFiles.map(f =>
          fs.move(path.join(pluginDir, f), path.join(pluginDir, '..', '..', f)),
        ),
      );

      props.onInstall();
      setAction({kind: 'Remove'});
    }),
    [props.name, props.version],
  );

  const performRemove = useCallback(
    catchError('Remove', async () => {
      reportUsage(`${TAG}:remove`, undefined, props.name);
      setAction({kind: 'Waiting'});
      await fs.remove(path.join(PLUGIN_DIR, props.name));
      props.onInstall();
      setAction({kind: 'Install'});
    }),
    [props.name],
  );

  const [action, setAction] = useState<InstallAction>(
    props.installed ? {kind: 'Remove'} : {kind: 'Install'},
  );

  if (action.kind === 'Waiting') {
    return <Spinner size={16} />;
  }
  if ((action.kind === 'Install' || action.kind === 'Remove') && action.error) {
  }
  const button = (
    <TableButton
      compact
      type={action.kind === 'Install' ? 'primary' : undefined}
      onClick={
        action.kind === 'Install'
          ? () => reportPlatformFailures(performInstall(), `${TAG}:install`)
          : () => reportPlatformFailures(performRemove(), `${TAG}:remove`)
      }>
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
  setRestartRequired: (restart: boolean) => void,
  query: string,
  setQuery: (query: string) => void,
  searchClientFactory: () => algoliasearch.Index,
  getInstalledPlugins: () => Promise<Map<string, PluginDefinition>>,
): TableRows_immutable {
  const index = useMemo(searchClientFactory, []);
  const [installedPlugins, setInstalledPlugins] = useState(
    new Map<string, PluginDefinition>(),
  );

  const getAndSetInstalledPlugins = () =>
    reportPlatformFailures(
      getInstalledPlugins(),
      `${TAG}:getInstalledPlugins`,
    ).then(setInstalledPlugins);

  useEffect(() => {
    reportUsage(`${TAG}:open`);
    getAndSetInstalledPlugins();
  }, []);

  const onInstall = useCallback(async () => {
    getAndSetInstalledPlugins();
    setRestartRequired(true);
  }, []);

  const createRow = useCallback(
    (h: PluginDefinition) => ({
      key: h.name,
      columns: {
        name: {value: <EllipsisText>{h.name}</EllipsisText>},
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
            />
          ),
          align: 'center' as 'center',
        },
      },
    }),
    [installedPlugins],
  );

  const [searchResults, setSearchResults] = useState<PluginDefinition[]>([]);

  useEffect(() => {
    (async () => {
      const {hits} = await reportPlatformFailures(
        index.search({
          query,
          filters: 'keywords:flipper-plugin',
          hitsPerPage: 20,
        }),
        `${TAG}:queryIndex`,
      );

      setSearchResults(hits.filter(hit => !installedPlugins.has(hit.name)));
      setQuery(query);
    })();
  }, [query, installedPlugins]);

  const results = Array.from(installedPlugins.values()).concat(searchResults);
  return List(results.map(createRow));
}

export default connect<PropsFromState, {}, OwnProps, AppState>(
  ({pluginManager: {installedPlugins}}) => ({
    installedPlugins,
  }),
  {},
)(PluginInstaller);
