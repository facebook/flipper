/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Value} from 'flipper';

const INT_DATA_TYPE = ['INTEGER', 'LONG', 'INT', 'BIGINT'];
const FLOAT_DATA_TYPE = ['REAL', 'DOUBLE'];
const BLOB_DATA_TYPE = ['BLOB'];

export function convertStringToValue(
  types: {[key: string]: {type: string; nullable: boolean}},
  key: string,
  value: string | null,
): Value {
  if (value !== null && types.hasOwnProperty(key)) {
    const {type, nullable} = types[key];
    if (value.length <= 0 && nullable) {
      return {type: 'null', value: null};
    }
    if (INT_DATA_TYPE.indexOf(type) >= 0) {
      return {type: 'integer', value: parseInt(value, 10)};
    } else if (FLOAT_DATA_TYPE.indexOf(type) >= 0) {
      return {type: 'float', value: parseFloat(value)};
    } else if (BLOB_DATA_TYPE.indexOf(type) >= 0) {
      return {type: 'blob', value};
    }
  }
  // if no type found assume type is nullable string
  if (value === null) {
    return {type: 'null', value: null};
  } else {
    return {type: 'string', value};
  }
}

function constructQueryClause(
  values: {[key: string]: Value},
  connector: string,
): string {
  return Object.entries(values).reduce(
    (clauses, [key, val]: [string, Value], idx) => {
      const {type, value} = val;
      const valueString =
        type === 'null'
          ? 'NULL'
          : type === 'string' || type === 'blob'
          ? `'${value}'`
          : `${value}`;
      if (idx <= 0) {
        return `${key}=${valueString}`;
      } else {
        return `${clauses} ${connector} ${key}=${valueString}`;
      }
    },
    '',
  );
}

export function constructUpdateQuery(
  table: string,
  where: {[key: string]: Value},
  change: {[key: string]: Value},
): string {
  return `UPDATE ${table}
    SET ${constructQueryClause(change, ',')}
    WHERE ${constructQueryClause(where, 'AND')}`;
}

export function isUpdatable(
  columnMeta: Array<string>,
  columnData: Array<Array<Value>>,
): boolean {
  const primaryKeyIdx = columnMeta.indexOf('primary_key');
  return (
    primaryKeyIdx >= 0 &&
    columnData.reduce((acc: boolean, column) => {
      const primaryValue = column[primaryKeyIdx];
      return acc || (primaryValue.type === 'boolean' && primaryValue.value);
    }, false)
  );
}
