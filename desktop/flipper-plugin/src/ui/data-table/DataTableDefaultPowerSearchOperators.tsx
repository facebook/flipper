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
  value: any,
) => boolean;

export type PowerSearchOperatorProcessorConfig = {
  [key: string]: PowerSearchOperatorProcessor;
};

export const dataTablePowerSearchOperators = {} satisfies {
  [key: string]: (...args: any[]) => OperatorConfig;
};

export const dataTablePowerSearchOperatorProcessorConfig =
  {} satisfies PowerSearchOperatorProcessorConfig;
