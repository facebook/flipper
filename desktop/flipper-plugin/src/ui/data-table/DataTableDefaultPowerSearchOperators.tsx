/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {OperatorConfig} from '../PowerSearch';

export type PowerSearchOperatorProcessor = (
  powerSearchOperatorConfig: OperatorConfig,
  searchValue: any,
  value: any,
) => boolean;

export const dataTablePowerSearchOperators = {
  string_contains: () => ({
    label: 'contains',
    key: 'string_contains',
    valueType: 'STRING',
  }),
  string_not_contains: () => ({
    label: 'does not contain',
    key: 'string_not_contains',
    valueType: 'STRING',
  }),
  string_matches_exactly: () => ({
    label: 'is',
    key: 'string_matches_exactly',
    valueType: 'STRING',
  }),
  string_not_matches_exactly: () => ({
    label: 'is not',
    key: 'string_not_matches_exactly',
    valueType: 'STRING',
  }),
  string_set_contains_any_of: () => ({
    label: 'contains any of',
    key: 'string_set_contains_any_of',
    valueType: 'STRING_SET',
  }),
  string_set_contains_none_of: () => ({
    label: 'contains none of',
    key: 'string_set_contains_none_of',
    valueType: 'STRING_SET',
  }),
  int_equals: () => ({
    label: '=',
    key: 'int_equals',
    valueType: 'INTEGER',
  }),
  int_greater_than: () => ({
    label: '>',
    key: 'int_greater_than',
    valueType: 'INTEGER',
  }),
  int_greater_or_equal: () => ({
    label: '>=',
    key: 'int_greater_or_equal',
    valueType: 'INTEGER',
  }),
  int_less_than: () => ({
    label: '<',
    key: 'int_less_than',
    valueType: 'INTEGER',
  }),
  int_less_or_equal: () => ({
    label: '<=',
    key: 'int_less_or_equal',
    valueType: 'INTEGER',
  }),
  float_greater_than: () => ({
    label: '>',
    key: 'float_greater_than',
    valueType: 'FLOAT',
  }),
  float_greater_or_equal: () => ({
    label: '>=',
    key: 'float_greater_or_equal',
    valueType: 'FLOAT',
  }),
  float_less_than: () => ({
    label: '<',
    key: 'float_less_than',
    valueType: 'FLOAT',
  }),
  float_less_or_equal: () => ({
    label: '<=',
    key: 'float_less_or_equal',
    valueType: 'FLOAT',
  }),
  // { [enumValue]: enumLabel }
  enum_is: (enumLabels: Record<string, string>) => ({
    label: 'is',
    key: 'enum_is',
    valueType: 'ENUM',
    enumLabels,
  }),
  enum_is_not: (enumLabels: Record<string, string>) => ({
    label: 'is not',
    key: 'enum_is_not',
    valueType: 'ENUM',
    enumLabels,
  }),
  enum_set_is_any_of: (enumLabels: Record<string, string>) => ({
    label: 'is any of',
    key: 'enum_set_is_any_of',
    valueType: 'ENUM_SET',
    enumLabels,
  }),
  enum_set_is_none_of: (enumLabels: Record<string, string>) => ({
    label: 'is none of',
    key: 'enum_set_is_none_of',
    valueType: 'ENUM_SET',
    enumLabels,
  }),
  is_nullish: () => ({
    label: 'is nullish',
    key: 'is_nullish',
    valueType: 'NO_VALUE',
  }),
} satisfies {
  [key: string]: (...args: any[]) => OperatorConfig;
};

export type PowerSearchOperatorProcessorConfig = {
  [K in keyof typeof dataTablePowerSearchOperators]: PowerSearchOperatorProcessor;
};

export const dataTablePowerSearchOperatorProcessorConfig = {
  string_contains: (_operator, searchValue: string, value: string) =>
    value.toLowerCase().includes(searchValue.toLowerCase()),
  string_not_contains: (_operator, searchValue: string, value: string) =>
    !value.toLowerCase().includes(searchValue.toLowerCase()),
  string_matches_exactly: (_operator, searchValue: string, value: string) =>
    value === searchValue,
  string_not_matches_exactly: (_operator, searchValue: string, value: string) =>
    value !== searchValue,
  // See PowerSearchStringSetTerm
  string_set_contains_any_of: (
    _operator,
    searchValue: string[],
    value: string,
  ) =>
    searchValue.some((item) =>
      value.toLowerCase().includes(item.toLowerCase()),
    ),
  string_set_contains_none_of: (
    _operator,
    searchValue: string[],
    value: string,
  ) =>
    !searchValue.some((item) =>
      value.toLowerCase().includes(item.toLowerCase()),
    ),
  int_equals: (_operator, searchValue: number, value: number) =>
    value === searchValue,
  int_greater_than: (_operator, searchValue: number, value: number) =>
    value > searchValue,
  int_greater_or_equal: (_operator, searchValue: number, value: number) =>
    value >= searchValue,
  int_less_than: (_operator, searchValue: number, value: number) =>
    value < searchValue,
  int_less_or_equal: (_operator, searchValue: number, value: number) =>
    value <= searchValue,
  float_greater_than: (_operator, searchValue: number, value: number) =>
    value > searchValue,
  float_greater_or_equal: (_operator, searchValue: number, value: number) =>
    value >= searchValue,
  float_less_than: (_operator, searchValue: number, value: number) =>
    value < searchValue,
  float_less_or_equal: (_operator, searchValue: number, value: number) =>
    value <= searchValue,
  enum_is: (_operator, searchValue: string, value: string) =>
    searchValue === value,
  enum_is_not: (_operator, searchValue: string, value: string) =>
    searchValue !== value,
  enum_set_is_any_of: (_operator, searchValue: string[], value: string) =>
    searchValue.some((item) => value === item),
  enum_set_is_none_of: (_operator, searchValue: string[], value: string) =>
    !searchValue.some((item) => value === item),
  is_nullish: (_operator, _searchValue, value) => value == null,
} satisfies PowerSearchOperatorProcessorConfig;
