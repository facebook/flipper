/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
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
} from 'flipper';
import React, {useCallback, useState, useMemo, useEffect} from 'react';
import {remote} from 'electron';
import {List} from 'immutable';
import algoliasearch from 'algoliasearch';
import path from 'path';
import fs from 'fs-extra';
import download from 'download-tarball';
import {homedir} from 'os';

const PLUGIN_DIR = path.join(homedir(), '.flipper', 'thirdparty');
const ALGOLIA_APPLICATION_ID = 'OFCNCOG2CU';
const ALGOLIA_API_KEY = 'f54e21fa3a2a0160595bb058179bfb1e';

type PluginDefinition = {
  name: string;
  version: string;
  description: string;
};

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

export default function() {
  const [restartRequired, setRestartRequired] = useState(false);
  const [query, setQuery] = useState('');
  const rows = useNPMSearch(setRestartRequired, query, setQuery);
  const restartApp = useCallback(() => {
    remote.app.relaunch();
    remote.app.exit();
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
        rows={rows}
      />
    </Container>
  );
}

const TableButton = styled(Button)({
  marginTop: 2,
});

const Spinner = styled(LoadingIndicator)({
  marginTop: 6,
});

function InstallButton(props: {
  name: string;
  version: string;
  onInstall: () => void;
  installed: boolean;
}) {
  type InstallAction = 'Install' | 'Waiting' | 'Remove';

  const onInstall = useCallback(async () => {
    setAction('Waiting');
    const filename = `${props.name}-${props.version}.tgz`;
    await download({
      url: `https://registry.npmjs.org/${props.name}/-/${filename}`,
      dir: PLUGIN_DIR,
    });
    await fs.rename(
      path.join(PLUGIN_DIR, 'package'),
      path.join(PLUGIN_DIR, props.name),
    );
    props.onInstall();
    setAction('Remove');
  }, [props.name, props.version]);

  const onRemove = useCallback(async () => {
    setAction('Waiting');
    await fs.remove(path.join(PLUGIN_DIR, props.name));
    props.onInstall();
    setAction('Install');
  }, [props.name]);

  const [action, setAction] = useState<InstallAction>(
    props.installed ? 'Remove' : 'Install',
  );

  if (action === 'Waiting') {
    return <Spinner size={16} />;
  }
  return (
    <TableButton
      compact
      type={action === 'Install' ? 'primary' : undefined}
      onClick={action === 'Install' ? onInstall : onRemove}>
      {action}
    </TableButton>
  );
}

function useNPMSearch(
  setRestartRequired: (restart: boolean) => void,
  query: string,
  setQuery: (query: string) => void,
): TableRows_immutable {
  const index = useMemo(() => {
    const client = algoliasearch(ALGOLIA_APPLICATION_ID, ALGOLIA_API_KEY);
    return client.initIndex('npm-search');
  }, []);

  const [installedPlugins, setInstalledPlugins] = useState(
    new Map<string, PluginDefinition>(),
  );

  useEffect(() => {
    getInstalledPlugns().then(setInstalledPlugins);
  }, []);

  const onInstall = useCallback(async () => {
    setInstalledPlugins(await getInstalledPlugns());
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
      const {hits} = await index.search({
        query,
        filters: 'keywords:flipper-plugin',
        hitsPerPage: 20,
      });

      setSearchResults(hits.filter(hit => !installedPlugins.has(hit.name)));
      setQuery(query);
    })();
  }, [query, installedPlugins]);

  const results = Array.from(installedPlugins.values()).concat(searchResults);
  return List(results.map(createRow));
}

async function getInstalledPlugns() {
  const dirs = await fs.readdir(PLUGIN_DIR);
  const plugins = await Promise.all<[string, PluginDefinition]>(
    dirs.map(
      name =>
        new Promise(async (resolve, reject) => {
          if (!(await fs.lstat(path.join(PLUGIN_DIR, name))).isDirectory()) {
            return resolve(undefined);
          }

          const packageJSON = await fs.readFile(
            path.join(PLUGIN_DIR, name, 'package.json'),
          );

          try {
            resolve([name, JSON.parse(packageJSON.toString())]);
          } catch (e) {
            reject(e);
          }
        }),
    ),
  );
  return new Map(plugins.filter(Boolean));
}
