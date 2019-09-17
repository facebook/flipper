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
} from 'flipper';
import React, {useCallback, useState} from 'react';
import {remote} from 'electron';
import {List} from 'immutable';

const Container = styled(FlexColumn)({
  width: 600,
  height: 400,
  background: colors.white,
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
  const [restartRequired] = useState(false);
  const [query, setQuery] = useState('');
  const restartApp = useCallback(() => {
    remote.app.relaunch();
    remote.app.exit();
  }, []);

  const rows = List();

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
