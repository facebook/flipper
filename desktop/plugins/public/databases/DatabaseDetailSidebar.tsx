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
  Input,
  DetailSidebar,
  Panel,
  ManagedDataInspector,
  styled,
  produce,
  colors,
} from 'flipper';

import {
  Value,
  valueToNullableString,
  renderValue,
} from './TypeBasedValueRenderer';

import {Button} from 'antd';

type TableRow = {
  col: string;
  type: Value['type'];
  value: React.ReactElement;
};

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

const TableDetailRow = styled.div({
  borderBottom: `1px solid ${colors.blackAlpha10}`,
  padding: 8,
});

const TableDetailRowTitle = styled.div({
  fontWeight: 'bold',
  marginBottom: 8,
});

const TableDetailRowType = styled.span({
  color: colors.light20,
  marginLeft: 8,
  fontWeight: 'normal',
});

const TableDetailRowValue = styled.div({});

function sidebarRows(labels: Array<string>, values: Array<Value>): TableRow[] {
  return labels.map((label, idx) => buildSidebarRow(label, values[idx]));
}

function buildSidebarRow(key: string, val: Value): TableRow {
  let output = renderValue(val, true);
  if (
    (val.type === 'string' || val.type === 'blob') &&
    (val.value[0] === '[' || val.value[0] === '{')
  ) {
    try {
      // eslint-disable-next-line
      var parsed = JSON.parse(val.value);
    } catch (_error) {}
    if (parsed) {
      output = (
        <ManagedDataInspector data={parsed} expandRoot={true} collapsed />
      );
    }
  }
  return {
    col: key,
    type: val.type,
    value: output,
  };
}

function sidebarEditableRows(
  labels: Array<string>,
  values: Array<Value>,
  rowDispatch: (action: RowAction) => void,
): TableRow[] {
  return labels.map((label, idx) =>
    buildSidebarEditableRow(label, values[idx], (value: string | null) =>
      rowDispatch({type: 'set', key: label, value}),
    ),
  );
}

function buildSidebarEditableRow(
  key: string,
  val: Value,
  onUpdateValue: (value: string | null) => void,
): TableRow {
  if (val.type === 'blob' || !val.type) {
    return buildSidebarRow(key, val);
  }
  return {
    col: key,
    type: val.type,
    value: (
      <EditField
        key={key}
        initialValue={valueToNullableString(val)}
        onUpdateValue={onUpdateValue}
      />
    ),
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
        style={{width: '100%'}}
      />
    );
  },
);

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
        {onSave ? (
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
        ) : null}
        <div>
          {rows.map((row) => (
            <TableDetailRow key={row.col}>
              <TableDetailRowTitle>
                {row.col}
                <TableDetailRowType>({row.type})</TableDetailRowType>
              </TableDetailRowTitle>
              <TableDetailRowValue>{row.value}</TableDetailRowValue>
            </TableDetailRow>
          ))}
        </div>
      </Panel>
    </DetailSidebar>
  );
});
