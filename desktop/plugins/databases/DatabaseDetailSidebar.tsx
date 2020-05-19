/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {QueriedTable} from '.';
import {
  Text,
  DetailSidebar,
  Panel,
  ManagedTable,
  TableRows,
  TableBodyRow,
  ManagedDataInspector,
} from 'flipper';

function sidebarRows(id: number, table: QueriedTable): TableRows {
  const columns = table.columns;
  const row = table.rows[id];
  if (columns.length === 1) {
    const sidebarArray = [];
    // TODO(T60896483): Narrow the scope of this try/catch block.
    try {
      const parsed = JSON.parse(row.columns[columns[0]].value.props.children);
      for (const key in parsed) {
        sidebarArray.push(
          buildSidebarRow(key, {
            props: {
              children: parsed[key],
            },
          }),
        );
      }
    } catch (e) {
      sidebarArray.push(
        buildSidebarRow(columns[0], row.columns[columns[0]].value),
      );
    }
    return sidebarArray;
  } else {
    return columns.map((column, i) =>
      buildSidebarRow(columns[i], row.columns[columns[i]].value),
    );
  }
}

function buildSidebarRow(key: string, val: any): TableBodyRow {
  let output: any = '';
  // TODO(T60896483): Narrow the scope of this try/catch block.
  try {
    const parsed = JSON.parse(val.props.children);
    for (const key in parsed) {
      try {
        parsed[key] = JSON.parse(parsed[key]);
      } catch (err) {}
    }
    output = (
      <ManagedDataInspector data={parsed} expandRoot={false} collapsed />
    );
  } catch (error) {
    output = val;
  }
  return {
    columns: {
      col: {value: <Text>{key}</Text>},
      val: {
        value: output,
      },
    },
    key: key,
  };
}

export default React.memo(function DatabaseDetailSidebar(props: {
  table: QueriedTable;
}) {
  const {table} = props;
  if (
    table.highlightedRows === null ||
    typeof table.highlightedRows === 'undefined' ||
    table.highlightedRows.length !== 1
  ) {
    return null;
  }
  const id = table.highlightedRows[0];
  const cols = {
    col: {
      value: 'Column',
      resizable: true,
    },
    val: {
      value: 'Value',
      resizable: true,
    },
  };
  const colSizes = {
    col: '35%',
    val: 'flex',
  };
  return (
    <DetailSidebar>
      <Panel
        heading="Row details"
        floating={false}
        collapsable={true}
        padded={false}>
        <ManagedTable
          highlightableRows={false}
          columnSizes={colSizes}
          multiline={true}
          columns={cols}
          autoHeight={true}
          floating={false}
          zebra={false}
          rows={sidebarRows(id, table)}
        />
      </Panel>
    </DetailSidebar>
  );
});
