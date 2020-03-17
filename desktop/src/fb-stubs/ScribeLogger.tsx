/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export type ScribeMessage = {
  category: string;
  message: string;
};

import {Logger} from '../fb-interfaces/Logger';

export default class ScribeLogger {
  constructor(_logger: Logger) {}
  send(_message: ScribeMessage) {}
}
