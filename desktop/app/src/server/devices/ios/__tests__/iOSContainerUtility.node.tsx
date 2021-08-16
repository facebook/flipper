/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {queryTargetsWithoutXcodeDependency} from '../iOSContainerUtility';
import {idbDescribeTargets} from '../iOSContainerUtility';

test('uses idbcompanion command for queryTargetsWithoutXcodeDependency', async () => {
  const mockedExec = jest.fn((_) =>
    Promise.resolve({
      stdout: '{"udid": "udid", "type": "physical", "name": "name"}',
      stderr: '{ "msg": "mocked stderr"}',
    }),
  );
  await queryTargetsWithoutXcodeDependency(
    'idbCompanionPath',
    true,
    (_) => Promise.resolve(true),
    mockedExec,
  );

  expect(mockedExec).toBeCalledWith('idbCompanionPath --list 1 --only device');
});

test('do not call idbcompanion if the path does not exist', async () => {
  const mockedExec = jest.fn((_) =>
    Promise.resolve({
      stdout: '{"udid": "udid", "type": "physical", "name": "name"}',
      stderr: '{"msg": "mocked stderr"}',
    }),
  );
  await queryTargetsWithoutXcodeDependency(
    'idbCompanionPath',
    true,
    (_) => Promise.resolve(false),
    mockedExec,
  );
  expect(mockedExec).toHaveBeenCalledTimes(0);
});

test('parses idb describe output', async () => {
  const mockedExec = jest.fn((_) =>
    Promise.resolve({
      stdout: `{"udid": "deafbeed", "type": "simulator", "name": "name", "state": "Booted"}
      {"udid": "f4ceb00c", "type": "physical", "name": "ponzicoin-miner", "state": "Booted"}
      {"udid": "ded", "type": "physical", "name": "350ppm", "state": "Shutdown"}
      `,
      stderr: '',
    }),
  );
  const targets = await idbDescribeTargets('/usr/bin/idb', mockedExec);
  expect(mockedExec).toBeCalledWith('/usr/bin/idb describe --json');
  expect(targets).toMatchInlineSnapshot(`
    Array [
      Object {
        "name": "name",
        "type": "emulator",
        "udid": "deafbeed",
      },
      Object {
        "name": "ponzicoin-miner",
        "type": "physical",
        "udid": "f4ceb00c",
      },
    ]
  `);
});
