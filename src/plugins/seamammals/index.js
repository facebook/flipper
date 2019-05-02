/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 * @flow strict-local
 */

import {Text, Panel, ManagedDataInspector, createTablePlugin} from 'flipper';

type Id = number;

type Row = {
  id: Id,
  title: string,
  url: string,
};

function buildRow(row: Row) {
  return {
    columns: {
      title: {
        value: <Text>{row.title}</Text>,
        filterValue: row.title,
      },
      url: {
        value: <Text>{row.url}</Text>,
        filterValue: row.url,
      },
    },
    key: row.id,
    copyText: JSON.stringify(row),
    filterValue: `${row.title} ${row.url}`,
  };
}

function renderSidebar(row: Row) {
  return (
    <Panel floating={false} heading={'Extras'}>
      <ManagedDataInspector data={row} expandRoot={true} />
    </Panel>
  );
}

const columns = {
  title: {
    value: 'Title',
  },
  url: {
    value: 'URL',
  },
};

const columnSizes = {
  title: '15%',
  url: 'flex',
};

export default createTablePlugin({
  method: 'newRow',
  columns,
  columnSizes,
  renderSidebar,
  buildRow,
});
