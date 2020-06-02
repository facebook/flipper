/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useMemo, useState, useEffect, useReducer} from 'react';
import {
  Text,
  Input,
  DetailSidebar,
  Panel,
  ManagedTable,
  TableRows,
  TableBodyRow,
  ManagedDataInspector,
  Value,
  valueToNullableString,
  renderValue,
  Layout,
  Button,
  styled,
  produce,
} from 'flipper';

type DatabaseDetailSidebarProps = {
  columnLabels: Array<string>;
  columnValues: Array<Value>;
  onSave?: ((changes: {[key: string]: string | null}) => void) | undefined;
};

const EditTriggerSection = styled.div({
  display: 'flex',
  justifyContent: 'flex-end',
  width: '100%',
  paddingTop: '3px',
  paddingBottom: '3px',
  paddingRight: '10px',
});

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

function sidebarEditableRows(
  labels: Array<string>,
  values: Array<Value>,
  rowDispatch: (action: RowAction) => void,
): TableRows {
  return labels.map((label, idx) =>
    buildSidebarEditableRow(
      label,
      valueToNullableString(values[idx]),
      (value: string | null) => rowDispatch({type: 'set', key: label, value}),
    ),
  );
}

function buildSidebarEditableRow(
  key: string,
  value: string | null,
  onUpdateValue: (value: string | null) => void,
): TableBodyRow {
  return {
    columns: {
      col: {value: <Text>{key}</Text>},
      val: {
        value: (
          <EditField
            key={key}
            initialValue={value}
            onUpdateValue={onUpdateValue}
          />
        ),
      },
    },
    key: key,
  };
}

const EditField = React.memo(
  (props: {
    initialValue: string | null;
    onUpdateValue: (value: string | null) => void;
  }) => {
    const {initialValue, onUpdateValue} = props;
    const [value, setValue] = useState<string | null>(initialValue);
    useEffect(() => setValue(initialValue), [initialValue]);
    return (
      <Input
        value={value || ''}
        onChange={(e) => {
          setValue(e.target.value);
          onUpdateValue(e.target.value);
        }}
        placeholder={value === null ? 'NULL' : undefined}
        data-testid={'update-query-input'}
      />
    );
  },
);
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

type RowState = {changes: {[key: string]: string | null}; updated: boolean};
type RowAction =
  | {type: 'set'; key: string; value: string | null}
  | {type: 'reset'};

const rowStateReducer = produce((draftState: RowState, action: RowAction) => {
  switch (action.type) {
    case 'set':
      draftState.changes[action.key] = action.value;
      draftState.updated = true;
      return;
    case 'reset':
      draftState.changes = {};
      draftState.updated = false;
      return;
  }
});

export default React.memo(function DatabaseDetailSidebar(
  props: DatabaseDetailSidebarProps,
) {
  const [editing, setEditing] = useState(false);
  const [rowState, rowDispatch] = useReducer(rowStateReducer, {
    changes: {},
    updated: false,
  });
  const {columnLabels, columnValues, onSave} = props;
  useEffect(() => rowDispatch({type: 'reset'}), [columnLabels, columnValues]);
  const rows = useMemo(
    () =>
      editing
        ? sidebarEditableRows(columnLabels, columnValues, rowDispatch)
        : sidebarRows(columnLabels, columnValues),
    [columnLabels, columnValues, editing],
  );
  return (
    <DetailSidebar>
      <Panel
        heading="Row details"
        floating={false}
        collapsable={true}
        padded={false}>
        <Layout.Top>
          {onSave && (
            <EditTriggerSection>
              {editing ? (
                <>
                  <Button
                    disabled={!rowState.updated}
                    onClick={() => {
                      onSave(rowState.changes);
                      setEditing(false);
                    }}>
                    Save
                  </Button>
                  <Button onClick={() => setEditing(false)}>Close</Button>
                </>
              ) : (
                <Button onClick={() => setEditing(true)}>Edit</Button>
              )}
            </EditTriggerSection>
          )}
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
        </Layout.Top>
      </Panel>
    </DetailSidebar>
  );
});
