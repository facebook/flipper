/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  FlexRow,
  ManagedTable,
  TableBodyRow,
  TableBodyColumn,
  Value,
  renderValue,
} from 'flipper';
import React, {useMemo} from 'react';

import {Structure} from './index';

function transformRow(
  columns: Array<string>,
  row: Array<Value>,
  index: number,
): TableBodyRow {
  const transformedColumns: {[key: string]: TableBodyColumn} = {};
  for (let i = 0; i < columns.length; i++) {
    transformedColumns[columns[i]] = {value: renderValue(row[i], true)};
  }
  return {key: String(index), columns: transformedColumns};
}

const DatabaseStructureManagedTable = React.memo(
  (props: {columns: Array<string>; rows: Array<Array<Value>>}) => {
    const {columns, rows} = props;
    const renderRows = useMemo(
      () =>
        rows.map((row: Array<Value>, index: number) =>
          transformRow(columns, row, index),
        ),
      [rows, columns],
    );
    const renderColumns = useMemo(
      () =>
        columns.reduce(
          (acc, val) =>
            Object.assign({}, acc, {[val]: {value: val, resizable: true}}),
          {},
        ),
      [columns],
    );
    const columnOrder = useMemo(
      () =>
        columns.map((name) => ({
          key: name,
          visible: true,
        })),
      [columns],
    );
    return (
      <FlexRow grow={true}>
        <ManagedTable
          floating={false}
          columnOrder={columnOrder}
          columns={renderColumns}
          zebra={true}
          rows={renderRows}
          horizontallyScrollable={true}
        />
      </FlexRow>
    );
  },
);

export default React.memo((props: {structure: Structure | null}) => {
  const {structure} = props;
  if (!structure) {
    return null;
  }
  const {columns, rows, indexesColumns, indexesValues} = structure;
  return (
    <>
      <DatabaseStructureManagedTable columns={columns} rows={rows} />
      <DatabaseStructureManagedTable
        columns={indexesColumns}
        rows={indexesValues}
      />
    </>
  );
});
