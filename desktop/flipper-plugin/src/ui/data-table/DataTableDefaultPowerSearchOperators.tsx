/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import dayjs from 'dayjs';
import {OperatorConfig} from '../PowerSearch';
import {
  EnumLabels,
  FloatOperatorConfig,
} from '../PowerSearch/PowerSearchConfig';

export type PowerSearchOperatorProcessor = (
  powerSearchOperatorConfig: OperatorConfig,
  searchValue: any,
  value: any,
) => boolean;

export const dataTablePowerSearchOperators = {
  string_matches_regex: () => ({
    label: 'matches regex',
    key: 'string_matches_regex',
    valueType: 'STRING',
  }),
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
  searializable_object_contains: () => ({
    label: 'contains',
    key: 'searializable_object_contains',
    valueType: 'STRING',
  }),
  searializable_object_contains_any_of: () => ({
    label: 'contains any of',
    key: 'searializable_object_contains_any_of',
    valueType: 'STRING_SET',
  }),
  searializable_object_matches_regex: () => ({
    label: 'matches regex',
    key: 'searializable_object_matches_regex',
    valueType: 'STRING',
  }),
  searializable_object_not_contains: () => ({
    label: 'does not contain',
    key: 'searializable_object_not_contains',
    valueType: 'STRING',
  }),
  searializable_object_contains_none_of: () => ({
    label: 'contains none of',
    key: 'searializable_object_contains_none_of',
    valueType: 'STRING_SET',
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
  float_equals: (precision?: number) => ({
    label: '=',
    key: 'float_equals',
    valueType: 'FLOAT',
    precision,
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
  // TODO: Support logical operations (AND, OR, NOT) to combine primitive operators instead of adding new complex operators!
  enum_set_is_nullish_or_any_of: (
    enumLabels: EnumLabels,
    allowFreeform?: boolean,
  ) => ({
    label: 'is nullish or any of',
    key: 'enum_set_is_nullish_or_any_of',
    valueType: 'ENUM_SET',
    enumLabels,
    allowFreeform,
  }),
  enum_set_is_any_of: (enumLabels: EnumLabels, allowFreeform?: boolean) => ({
    label: 'is any of',
    key: 'enum_set_is_any_of',
    valueType: 'ENUM_SET',
    enumLabels,
    allowFreeform,
  }),
  enum_set_is_none_of: (enumLabels: EnumLabels, allowFreeform?: boolean) => ({
    label: 'is none of',
    key: 'enum_set_is_none_of',
    valueType: 'ENUM_SET',
    enumLabels,
    allowFreeform,
  }),
  is_nullish: () => ({
    label: 'is nullish',
    key: 'is_nullish',
    valueType: 'NO_VALUE',
  }),
  newer_than_absolute_date: () => ({
    key: 'newer_than_absolute_date',
    label: 'is after',
    valueType: 'ABSOLUTE_DATE',
    dateOnly: false,
  }),
  newer_than_absolute_date_no_time: () => ({
    key: 'newer_than_absolute_date_no_time',
    label: 'is after the day',
    valueType: 'ABSOLUTE_DATE',
    dateOnly: true,
  }),
  older_than_absolute_date: () => ({
    key: 'older_than_absolute_date',
    label: 'is before',
    valueType: 'ABSOLUTE_DATE',
    dateOnly: false,
  }),
  older_than_absolute_date_no_time: () => ({
    key: 'older_than_absolute_date_no_time',
    label: 'is before the day',
    valueType: 'ABSOLUTE_DATE',
    dateOnly: true,
  }),
  same_as_absolute_date_no_time: () => ({
    key: 'same_as_absolute_date_no_time',
    label: 'is',
    valueType: 'ABSOLUTE_DATE',
    dateOnly: true,
  }),
} satisfies {
  [key: string]: (...args: any[]) => OperatorConfig;
};
// Legacy enum term support. Remove me in a couple of months.
(dataTablePowerSearchOperators as any).enum_is =
  dataTablePowerSearchOperators.enum_set_is_any_of;
(dataTablePowerSearchOperators as any).enum_is_not =
  dataTablePowerSearchOperators.enum_set_is_none_of;
(dataTablePowerSearchOperators as any).enum_is_nullish_or =
  dataTablePowerSearchOperators.enum_set_is_nullish_or_any_of;

export type PowerSearchOperatorProcessorConfig = {
  [K in keyof typeof dataTablePowerSearchOperators]: PowerSearchOperatorProcessor;
};

const tryConvertingUnknownToString = (value: unknown): string | null => {
  try {
    if (value == null) {
      return null;
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    if (typeof value === 'number') {
      return value.toString();
    }
    if (typeof value === 'string') {
      return value;
    }
    throw value;
  } catch (e) {
    console.warn(
      'tryConvertingUnknownToString -> you tried to use power search for some weird data type. Please, configure your MasterDetail component to handle it correctly. See https://fburl.com/workplace/i2n0z6sm',
      e,
    );
    return null;
  }
};

const regexCache: Record<string, RegExp> = {};
function safeCreateRegExp(source: string): RegExp | undefined {
  try {
    if (!regexCache[source]) {
      regexCache[source] = new RegExp(source);
    }
    return regexCache[source];
  } catch (_e) {
    return undefined;
  }
}

const enumPredicateForWhenValueCouldBeAStringifiedNullish = (
  // searchValue is typed as a string here, but originally it could have been an undefined or a null and we stringified them during inference (search for `inferEnumOptionsFromData`)
  searchValue: string,
  value: string | null | undefined,
): boolean => {
  if (searchValue === value) {
    return true;
  }
  if (value === null && searchValue === 'null') {
    return true;
  }
  if (value === undefined && searchValue === 'undefined') {
    return true;
  }
  return false;
};

export const dataTablePowerSearchOperatorProcessorConfig = {
  string_matches_regex: (_operator, searchValue: string, value: string) =>
    !!safeCreateRegExp(searchValue)?.test(
      tryConvertingUnknownToString(value) ?? '',
    ),
  string_contains: (_operator, searchValue: string, value: string) =>
    !!tryConvertingUnknownToString(value)
      ?.toLowerCase()
      .includes(searchValue.toLowerCase()),
  string_not_contains: (_operator, searchValue: string, value: string) =>
    !tryConvertingUnknownToString(value)
      ?.toLowerCase()
      .includes(searchValue.toLowerCase()),
  searializable_object_matches_regex: (
    _operator,
    searchValue: string,
    value: object,
  ) => !!safeCreateRegExp(searchValue)?.test(JSON.stringify(value)),
  searializable_object_contains: (
    _operator,
    searchValue: string,
    value: object,
  ) => JSON.stringify(value).toLowerCase().includes(searchValue.toLowerCase()),
  searializable_object_contains_any_of: (
    _operator,
    searchValue: string[],
    value: object,
  ) =>
    searchValue.some((item) =>
      JSON.stringify(value)?.toLowerCase().includes(item.toLowerCase()),
    ),
  searializable_object_not_contains: (
    _operator,
    searchValue: string,
    value: object,
  ) => !JSON.stringify(value).toLowerCase().includes(searchValue.toLowerCase()),
  searializable_object_contains_none_of: (
    _operator,
    searchValue: string[],
    value: object,
  ) =>
    !searchValue.some((item) =>
      JSON.stringify(value)?.toLowerCase().includes(item.toLowerCase()),
    ),
  string_matches_exactly: (_operator, searchValue: string, value: string) =>
    tryConvertingUnknownToString(value) === searchValue,
  string_not_matches_exactly: (_operator, searchValue: string, value: string) =>
    tryConvertingUnknownToString(value) !== searchValue,
  // See PowerSearchStringSetTerm
  string_set_contains_any_of: (
    _operator,
    searchValue: string[],
    value: string,
  ) =>
    searchValue.some((item) =>
      tryConvertingUnknownToString(value)
        ?.toLowerCase()
        .includes(item.toLowerCase()),
    ),
  string_set_contains_none_of: (
    _operator,
    searchValue: string[],
    value: string,
  ) =>
    !searchValue.some((item) =>
      tryConvertingUnknownToString(value)
        ?.toLowerCase()
        .includes(item.toLowerCase()),
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
  float_equals: (operator, searchValue: number, value: number) => {
    const precision = (operator as FloatOperatorConfig).precision ?? 0.01;
    return value <= searchValue + precision && value >= searchValue - precision;
  },
  float_greater_than: (_operator, searchValue: number, value: number) =>
    value > searchValue,
  float_greater_or_equal: (_operator, searchValue: number, value: number) =>
    value >= searchValue,
  float_less_than: (_operator, searchValue: number, value: number) =>
    value < searchValue,
  float_less_or_equal: (_operator, searchValue: number, value: number) =>
    value <= searchValue,
  enum_set_is_nullish_or_any_of: (
    _operator,
    searchValue: string[],
    value?: string | null,
  ) =>
    value == null ||
    searchValue.some((item) =>
      enumPredicateForWhenValueCouldBeAStringifiedNullish(item, value),
    ),
  enum_set_is_any_of: (_operator, searchValue: string[], value: string) =>
    searchValue.some((item) =>
      enumPredicateForWhenValueCouldBeAStringifiedNullish(item, value),
    ),
  enum_set_is_none_of: (_operator, searchValue: string[], value: string) =>
    !searchValue.some((item) =>
      enumPredicateForWhenValueCouldBeAStringifiedNullish(item, value),
    ),
  is_nullish: (_operator, _searchValue, value) => value == null,
  // See PowerSearchAbsoluteDateTerm
  newer_than_absolute_date: (_operator, searchValue: Date, value: any) => {
    const valueNormalized = dayjs(value);
    return valueNormalized.isAfter(searchValue);
  },
  newer_than_absolute_date_no_time: (
    _operator,
    searchValue: Date,
    value: any,
  ) => {
    const valueNormalized = dayjs(value);
    return valueNormalized.isAfter(searchValue);
  },
  older_than_absolute_date: (_operator, searchValue: Date, value: any) => {
    const valueNormalized = dayjs(value);
    return valueNormalized.isBefore(searchValue);
  },
  older_than_absolute_date_no_time: (
    _operator,
    searchValue: Date,
    value: any,
  ) => {
    const valueNormalized = dayjs(value);
    return valueNormalized.isBefore(searchValue);
  },
  same_as_absolute_date_no_time: (_operator, searchValue: Date, value: any) => {
    const valueNormalized = dayjs(value);
    return valueNormalized.isSame(searchValue, 'day');
  },
} satisfies PowerSearchOperatorProcessorConfig;
