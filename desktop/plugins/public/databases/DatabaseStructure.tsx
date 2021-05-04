/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Value, renderValue} from './TypeBasedValueRenderer';
import {DataTable, DataTableColumn, Layout, useMemoize} from 'flipper-plugin';
import React from 'react';
import {Structure} from './index';

function createRows(
  columns: string[],
  rows: Value[][],
): {[key: string]: Value}[] {
  return rows.map((values) =>
    values.reduce((acc: {[key: string]: Value}, cur: Value, i: number) => {
      acc[columns[i]] = cur;
      return acc;
    }, {}),
  );
}

function createColumnConfig(columns: string[]) {
  const columnObjs: DataTableColumn<{[key: string]: Value}>[] = columns.map(
    (c) => ({
      key: c,
      title: c,
      onRender(row) {
        return renderValue(row[c]);
      },
    }),
  );
  return columnObjs;
}

export default React.memo((props: {structure: Structure}) => {
  const {structure} = props;
  const {columns, rows, indexesColumns, indexesValues} = structure;
  const rowObjs = useMemoize(
    (columns: string[], rows: Value[][]) => createRows(columns, rows),
    [columns, rows],
  );
  const columnObjs = useMemoize(
    (columns: string[]) => createColumnConfig(columns),
    [columns],
  );
  const indexRowObjs = useMemoize(
    (indexesColumns: string[], indexesValues: Value[][]) =>
      createRows(indexesColumns, indexesValues),
    [indexesColumns, indexesValues],
  );
  const indexColumnObjs = useMemoize(
    (indexesColumns: string[]) => createColumnConfig(indexesColumns),
    [indexesColumns],
  );

  return (
    <Layout.Top resizable height={400}>
      <DataTable<{[key: string]: Value}>
        records={rowObjs}
        columns={columnObjs}
        enableSearchbar={false}
      />
      <DataTable<{[key: string]: Value}>
        records={indexRowObjs}
        columns={indexColumnObjs}
        enableSearchbar={false}
      />
    </Layout.Top>
  );
});
