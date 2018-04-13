/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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
