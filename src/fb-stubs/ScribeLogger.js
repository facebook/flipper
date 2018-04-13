/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

export type ScribeMessage = {|
  category: string,
  message: string,
|};

import type Logger from './Logger.js';

export default class ScribeLogger {
  constructor(logger: Logger) {}
  send(message: ScribeMessage) {}
}
