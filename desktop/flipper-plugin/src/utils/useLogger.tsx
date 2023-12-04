/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Logger} from 'flipper-common';
import {createContext, useContext} from 'react';
import {stubLogger} from './Logger';

export const _LoggerContext = createContext<Logger>(stubLogger);

/**
 * Provides the default logger that can be used for console logging,
 * error reporting and performance measurements.
 * In internal Facebook builds this is wired up to the internal statistic reporting.
 * Prefer using `logger` over using `console` directly.
 */
export function useLogger(): Logger {
  return useContext(_LoggerContext);
}
