/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Value} from './TypeBasedValueRenderer';

const INT_DATA_TYPE = ['INTEGER', 'LONG', 'INT', 'BIGINT'];
const FLOAT_DATA_TYPE = ['REAL', 'DOUBLE'];
const BLOB_DATA_TYPE = ['BLOB'];

export function convertStringToValue(
  types: {[key: string]: {type: string; nullable: boolean}},
  key: string,
  value: string | null,
): Value {
  if (types.hasOwnProperty(key)) {
    const {type, nullable} = types[key];
    value = value === null ? '' : value;
    if (value.length <= 0 && nullable) {
      return {type: 'null', value: null};
    }

    if (INT_DATA_TYPE.indexOf(type) >= 0) {
      const converted = parseInt(value, 10);
      return {type: 'integer', value: isNaN(converted) ? 0 : converted};
    } else if (FLOAT_DATA_TYPE.indexOf(type) >= 0) {
      const converted = parseFloat(value);
      return {type: 'float', value: isNaN(converted) ? 0 : converted};
    } else if (BLOB_DATA_TYPE.indexOf(type) >= 0) {
      return {type: 'blob', value};
    } else {
      return {type: 'string', value};
    }
  }
  // if no type found assume type is nullable string
  if (value === null || value.length <= 0) {
    return {type: 'null', value: null};
  } else {
    return {type: 'string', value};
  }
}

export function constructQueryClause(
  values: {[key: string]: Value},
  connector: string,
): string {
  return Object.entries(values).reduce(
    (clauses, [key, val]: [string, Value], idx) => {
      const valueString =
        val.type === 'null'
          ? 'NULL'
          : val.type === 'string' || val.type === 'blob'
          ? `'${val.value.replace(/'/g, "''")}'`
          : `${val.value}`;
      if (idx <= 0) {
        return `\`${key}\`=${valueString}`;
      } else {
        return `${clauses} ${connector} \`${key}\`=${valueString}`;
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
  return `UPDATE \`${table}\`
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
