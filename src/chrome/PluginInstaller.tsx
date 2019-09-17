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

const Container = styled(FlexColumn)({
  width: 600,
  height: 400,
  background: colors.white,
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

const RestartBar = styled(FlexColumn)({
  backgroundColor: colors.red,
  color: colors.white,
  fontWeight: 500,
  padding: 10,
  cursor: 'pointer',
  textAlign: 'center',
});

export default function(props: {onHide: () => any}) {
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
        key="FuryEvents"
        rowLineHeight={28}
        floating={false}
        multiline={true}
        columnSizes={columnSizes}
        columns={columns}
        highlightableRows={false}
        highlightedRows={new Set()}
        rows={rows}
      />
      <Toolbar position="bottom">
        <Spacer />
        <Button onClick={props.onHide}>Close</Button>
      </Toolbar>
    </Container>
  );
}

const TableButton = styled(Button)({
  marginTop: 2,
});

function InstallButton(props: {
  name: string;
  version: string;
  onInstall: () => void;
}) {
  type InstallAction = 'Install' | 'Downloading' | 'Remove';

  const onInstall = useCallback(async () => {
    setAction('Downloading');
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
    fs.remove(path.join(PLUGIN_DIR, props.name));
    setAction('Install');
  }, [props.name]);

  const [action, setAction] = useState<InstallAction>('Install');

  if (action === 'Downloading') {
    return <LoadingIndicator size={16} />;
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

  const onInstall = useCallback(async () => {
    setRestartRequired(true);
  }, []);

  const createRow = useCallback(
    (h: PluginDefinition) => ({
      key: h.name,
      columns: {
        name: {value: <EllipsisText bold>{h.name}</EllipsisText>},
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
            />
          ),
          align: 'center' as 'center',
        },
      },
    }),
    [],
  );

  const [searchResults, setSearchResults] = useState<PluginDefinition[]>([]);

  useEffect(() => {
    (async () => {
      const {hits} = await index.search({
        query,
        filters: 'keywords:flipper-plugin',
        hitsPerPage: 20,
      });

      setSearchResults(hits);
      setQuery(query);
    })();
  }, [query]);

  return List(searchResults.map(createRow));
}
