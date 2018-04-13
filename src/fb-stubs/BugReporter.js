/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 * @format
 */

import LogManager from './Logger';

export default class BugReporter {
  constructor(logManager: LogManager) {}
  async report(title: string, body: string): Promise<number> {
    return Promise.resolve(-1);
  }
}
