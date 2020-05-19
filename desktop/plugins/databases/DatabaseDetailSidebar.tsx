/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useMemo} from 'react';
import {
  Text,
  DetailSidebar,
  Panel,
  ManagedTable,
  TableRows,
  TableBodyRow,
  ManagedDataInspector,
  Value,
  renderValue,
} from 'flipper';

type DatabaseDetailSidebarProps = {
  columnLabels: Array<string>;
  columnValues: Array<Value>;
};

function sidebarRows(labels: Array<string>, values: Array<Value>): TableRows {
  return labels.map((label, idx) => buildSidebarRow(label, values[idx]));
}

function buildSidebarRow(key: string, val: Value): TableBodyRow {
  let output = renderValue(val, true);
  // TODO(T60896483): Narrow the scope of this try/catch block.
  if (val.type === 'string') {
    try {
      const parsed = JSON.parse(val.value);
      output = (
        <ManagedDataInspector data={parsed} expandRoot={false} collapsed />
      );
    } catch (_error) {}
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

export default React.memo(function DatabaseDetailSidebar(
  props: DatabaseDetailSidebarProps,
) {
  const {columnLabels, columnValues} = props;
  const rows = useMemo(() => sidebarRows(columnLabels, columnValues), [
    columnLabels,
    columnValues,
  ]);
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
          rows={rows}
        />
      </Panel>
    </DetailSidebar>
  );
});
