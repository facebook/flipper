/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// Mostly matches https://www.internalfb.com/code/www/html/intern/js/ui/PowerSearch/PowerSearchExampleConfig.js

export type SimpleFilterValueType = 'NO_VALUE' | 'INTEGER' | 'FLOAT' | 'STRING';

export type EnumFilterValueType = 'ENUM' | 'ENUM_SET';

export type AbsoluteDateFilterValueType = 'ABSOLUTE_DATE';

export type SimpleOperatorConfig = {
  valueType: SimpleFilterValueType;
  key: string;
  label: string;
};

export type EnumOperatorConfig = {
  valueType: EnumFilterValueType;
  key: string;
  label: string;
  enumLabels: {[key: string]: string};
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
  | SimpleOperatorConfig
  | EnumOperatorConfig
  | AbsoluteDateOperatorConfig;

export type FieldConfig = {
  key: string;
  label: string;
  operators: {[key: string]: OperatorConfig};
};

export type PowerSearchConfig = {
  name: string;
  fields: {[key: string]: FieldConfig};
};
