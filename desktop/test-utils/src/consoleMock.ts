/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

/*
 * mock-fs library has issues with calls to console.log in jest tests which are not resolved yet,
 * so this console log can be used as a workaround in jest tests with fs-mocks:
 *   const realConsole = global.console;
 *   global.console = consoleMock as any;
 *   afterAll(() => {
 *     global.console = realConsole;
 *   });
 * See details: https://github.com/tschaub/mock-fs/issues/234
 */

function format(entry: any) {
  if (typeof entry === 'object') {
    try {
      return JSON.stringify(entry);
    } catch (e) {}
  }

  return entry;
}

function log(...msgs: any) {
  process.stdout.write(msgs.map(format).join(' ') + '\n');
}

export default {
  log,
  warn: log,
  error: log,
};
