/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {ManagedDataInspector, Panel} from 'flipper';
import {createTablePlugin} from '../createTablePlugin';

type RowData = {
  id: string,
  columns: {},
  details: {},
};

function buildRow(rowData: RowData, previousRowData: ?RowData) {
  if (!rowData.columns) {
    throw new Error('defaultBuildRow used with incorrect data format.');
  }
  const oldColumns =
    previousRowData && previousRowData.columns
      ? Object.keys(previousRowData.columns).reduce((map, key) => {
          if (key !== previousRowData?.id) {
            map[key] = {
              value: (previousRowData?.columns || {})[key].value,
              isFilterable: true,
            };
          }
          return map;
        }, {})
      : {};
  const columns = Object.keys(rowData.columns).reduce((map, key) => {
    if (key !== rowData.id) {
      map[key] = {
        value: rowData.columns && rowData.columns[key].value,
        isFilterable: true,
      };
    }
    return map;
  }, oldColumns);
  return {
    columns,
    key: rowData.id,
    copyText: JSON.stringify(rowData),
    filterValue: rowData.id,
  };
}

function renderSidebar(rowData: RowData) {
  if (!rowData.details) {
    throw new Error('defaultRenderSidebar used with incorrect data format.');
  }
  return (
    <Panel floating={false} heading={'Details'}>
      <ManagedDataInspector data={rowData.details} expandRoot={true} />
    </Panel>
  );
}

export default function createTableNativePlugin(id: string, title: string) {
  return createTablePlugin({
    method: 'updateRows',
    title,
    id,
    renderSidebar: renderSidebar,
    buildRow: buildRow,
  });
}
