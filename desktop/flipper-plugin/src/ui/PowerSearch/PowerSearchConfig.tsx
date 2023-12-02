/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// Mostly matches https://www.internalfb.com/code/www/html/intern/js/ui/PowerSearch/PowerSearchExampleConfig.js

export type NullishFilterValueType = 'NO_VALUE';

export type StringFilterValueType = 'STRING';

export type StringSetFilterValueType = 'STRING_SET';

export type IntegerFilterValueType = 'INTEGER';

export type FloatFilterValueType = 'FLOAT';

export type EnumFilterValueType = 'ENUM_SET';

export type AbsoluteDateFilterValueType = 'ABSOLUTE_DATE';

export type NullishOperatorConfig = {
  valueType: NullishFilterValueType;
  key: string;
  label: string;
};

export type StringOperatorConfig = {
  valueType: StringFilterValueType;
  key: string;
  label: string;
};

export type StringSetOperatorConfig = {
  valueType: StringSetFilterValueType;
  key: string;
  label: string;
};

export type IntegerOperatorConfig = {
  valueType: IntegerFilterValueType;
  key: string;
  label: string;
};

export type FloatOperatorConfig = {
  valueType: FloatFilterValueType;
  key: string;
  label: string;
  precision?: number;
};

/**
 * { value: label }
 */
export type EnumLabels = {[key: string | number]: string | number};

export type EnumOperatorConfig = {
  valueType: EnumFilterValueType;
  key: string;
  label: string;
  enumLabels: EnumLabels;
  allowFreeform?: boolean;
};

export type AbsoluteDateOperatorConfig = {
  valueType: AbsoluteDateFilterValueType;
  key: string;
  label: string;
  dateOnly?: boolean;
  minValue?: Date;
  maxValue?: Date;
};

export type OperatorConfig =
  | NullishOperatorConfig
  | StringOperatorConfig
  | StringSetOperatorConfig
  | IntegerOperatorConfig
  | FloatOperatorConfig
  | EnumOperatorConfig
  | AbsoluteDateOperatorConfig;

export type FieldConfig = {
  key: string;
  label: string;
  operators: {[key: string]: OperatorConfig};
  useWholeRow?: boolean;
};

export type PowerSearchConfig = {
  fields: {[key: string]: FieldConfig};
};
