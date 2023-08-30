/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// Mostly mateches https://www.internalfb.com/code/www/html/intern/js/ui/PowerSearch/PowerSearchExampleConfig.js

export type SimpleFilterValueType = 'NESTED' | 'NO_VALUE' | 'INTEGER' | 'FLOAT';

export type StringFilterValueType = 'STRING_SET' | 'STRING';

export type EnumFilterValueType = 'ENUM_SET' | 'ENUM';

export type RelativeDateFilterValueType = 'RELATIVE_DATE';

export type AbsoluteDateFilterValueType = 'ABSOLUTE_DATE';

export type TimeFilterValueType = 'TIME';

export type SimpleOperatorConfig = {
  valueType: SimpleFilterValueType;
  key: string;
  label: string;
};

export type StringOperatorConfig = {
  valueType: StringFilterValueType;
  key: string;
  label: string;
  allowArbitraryEntries?: boolean;
};

export type EnumOperatorConfig = {
  valueType: EnumFilterValueType;
  key: string;
  label: string;
  enumLabels: {[key: string]: string};
};

export type InternPowerSearchRelativeDateAllowableTensesType =
  | 'PAST_ONLY'
  | 'FUTURE_ONLY'
  | 'PAST_AND_FUTURE';

export type RelativeDateOperatorConfig = {
  valueType: RelativeDateFilterValueType;
  key: string;
  label: string;
  allowableTenses: InternPowerSearchRelativeDateAllowableTensesType;
  isNegative?: boolean;
};

export type AbsoluteDateOperatorConfig = {
  valueType: AbsoluteDateFilterValueType;
  key: string;
  label: string;
  dateOnly?: boolean;
  minValue?: Date;
  maxValue?: Date;
  isNegative?: boolean;
};

export type TimeOperatorConfig = {
  valueType: TimeFilterValueType;
  key: string;
  label: string;
  minValue?: Date;
  maxValue?: Date;
  isNegative?: boolean;
};

export type OperatorConfig =
  | SimpleOperatorConfig
  | StringOperatorConfig
  | EnumOperatorConfig
  | AbsoluteDateOperatorConfig
  | RelativeDateOperatorConfig
  | TimeOperatorConfig;

export type FieldConfig = {
  key: string;
  label: string;
  operators: {[key: string]: OperatorConfig};
  operatorMenuDisplayOrder: string[];
};

export type PowerSearchConfig = {
  name: string;
  fields: {[key: string]: FieldConfig};
  fieldKeyTypeaheadOrder?: string[];
};
