/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {makeIOSBridge} from '../IOSBridge';
import childProcess from 'child_process';
import * as promisifyChildProcess from 'promisify-child-process';
import {mocked} from 'ts-jest/utils';

jest.mock('child_process');
const spawn = mocked(childProcess.spawn);

jest.mock('promisify-child-process');
const exec = mocked(promisifyChildProcess.exec);

test('uses xcrun with no idb when xcode is detected', async () => {
  const ib = await makeIOSBridge('', true);
  expect(ib.startLogListener).toBeDefined();

  ib.startLogListener!('deadbeef', 'emulator');

  expect(spawn).toHaveBeenCalledWith(
    'xcrun',
    [
      'simctl',
      'spawn',
      'deadbeef',
      'log',
      'stream',
      '--style',
      'json',
      '--predicate',
      'senderImagePath contains "Containers"',
      '--debug',
      '--info',
    ],
    {},
  );
});

test('uses idb when present and xcode detected', async () => {
  const ib = await makeIOSBridge('/usr/local/bin/idb', true, async (_) => true);
  expect(ib.startLogListener).toBeDefined();

  ib.startLogListener!('deadbeef', 'emulator');

  expect(spawn).toHaveBeenCalledWith(
    '/usr/local/bin/idb',
    [
      'log',
      '--udid',
      'deadbeef',
      '--',
      '--style',
      'json',
      '--predicate',
      'senderImagePath contains "Containers"',
      '--debug',
      '--info',
    ],
    {},
  );
});

test('uses idb when present and xcode detected and physical device connected', async () => {
  const ib = await makeIOSBridge('/usr/local/bin/idb', true, async (_) => true);
  expect(ib.startLogListener).toBeDefined();

  ib.startLogListener!('deadbeef', 'physical');

  expect(spawn).toHaveBeenCalledWith(
    '/usr/local/bin/idb',
    [
      'log',
      '--udid',
      'deadbeef',
      '--',
      // no further args; not supported by idb atm
    ],
    {},
  );
});

test("without idb physical devices can't log", async () => {
  const ib = await makeIOSBridge('', true);
  expect(ib.idbAvailable).toBeFalsy();
  expect(ib.startLogListener).toBeDefined(); // since we have xcode
});

test('uses no log listener when xcode is not detected', async () => {
  const ib = await makeIOSBridge('', false);
  expect(ib.startLogListener).toBeUndefined();
});

test('uses xcrun to take screenshots with no idb when xcode is detected', async () => {
  const ib = await makeIOSBridge('', true);

  ib.screenshot!('deadbeef');

  expect(exec).toHaveBeenCalledWith(
    'xcrun simctl io deadbeef screenshot /temp/00000000-0000-0000-0000-000000000000.png',
  );
});

test('uses idb to take screenshots when available', async () => {
  const ib = await makeIOSBridge('/usr/local/bin/idb', true, async (_) => true);

  ib.screenshot!('deadbeef');

  expect(exec).toHaveBeenCalledWith(
    'idb screenshot --udid deadbeef /temp/00000000-0000-0000-0000-000000000000.png',
  );
});
