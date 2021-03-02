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
import {mocked} from 'ts-jest/utils';

jest.mock('child_process');
const spawn = mocked(childProcess.spawn);

test('uses xcrun with no idb', async () => {
  const ib = await makeIOSBridge('');
  ib.startLogListener('deadbeef');

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

test('uses idb when present', async () => {
  const ib = await makeIOSBridge('/usr/local/bin/idb');
  ib.startLogListener('deadbeef');

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
