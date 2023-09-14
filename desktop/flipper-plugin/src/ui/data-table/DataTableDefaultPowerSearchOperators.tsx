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
} satisfies {
  [key: string]: (...args: any[]) => OperatorConfig;
};

export type PowerSearchOperatorProcessorConfig = {
  [K in keyof typeof dataTablePowerSearchOperators]: PowerSearchOperatorProcessor;
};

export const dataTablePowerSearchOperatorProcessorConfig = {
  string_contains: (operator, searchValue, value) =>
    (value as string)
      .toLowerCase()
      .includes((searchValue as string).toLowerCase()),
  string_not_contains: (operator, searchValue, value) =>
    !(value as string)
      .toLowerCase()
      .includes((searchValue as string).toLowerCase()),
} satisfies PowerSearchOperatorProcessorConfig;
