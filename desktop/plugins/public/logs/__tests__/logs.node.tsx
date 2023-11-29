/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {sleep, TestUtils} from 'flipper-plugin';
import * as LogsPlugin from '../index';

const entry1 = {
  date: new Date(1611854112859),
  message: 'test1',
  pid: 0,
  tag: 'test',
  tid: 1,
  type: 'error',
  app: 'X',
} as const;
const entry2 = {
  date: new Date(1611854117859),
  message: 'test2',
  pid: 2,
  tag: 'test',
  tid: 3,
  type: 'warn',
  app: 'Y',
} as const;
const entry3 = {
  date: new Date(1611854112859),
  message: 'test3',
  pid: 0,
  tag: 'test',
  tid: 1,
  type: 'error',
  app: 'X',
} as const;

test('it will merge equal rows', () => {
  const {instance, sendLogEntry} = TestUtils.startDevicePlugin(LogsPlugin);

  sendLogEntry(entry1);
  sendLogEntry(entry2);
  sendLogEntry({
    ...entry2,
    date: new Date(1611954117859),
  });
  sendLogEntry(entry3);

  expect(instance.rows.records()).toMatchInlineSnapshot(`
    [
      {
        "app": "X",
        "count": 1,
        "date": 2021-01-28T17:15:12.859Z,
        "message": "test1",
        "pid": 0,
        "pidStr": "0",
        "tag": "test",
        "tid": 1,
        "type": "error",
      },
      {
        "app": "Y",
        "count": 2,
        "date": 2021-01-28T17:15:17.859Z,
        "message": "test2",
        "pid": 2,
        "pidStr": "2",
        "tag": "test",
        "tid": 3,
        "type": "warn",
      },
      {
        "app": "X",
        "count": 1,
        "date": 2021-01-28T17:15:12.859Z,
        "message": "test3",
        "pid": 0,
        "pidStr": "0",
        "tag": "test",
        "tid": 1,
        "type": "error",
      },
    ]
  `);
});

test('it supports deeplink and select nodes + navigating to bottom', async () => {
  const {instance, sendLogEntry, triggerDeepLink, act, triggerMenuEntry} =
    TestUtils.renderDevicePlugin(LogsPlugin);

  sendLogEntry(entry1);
  sendLogEntry(entry2);
  sendLogEntry(entry3);

  expect(instance.tableManagerRef).not.toBeUndefined();
  expect(instance.tableManagerRef.current).not.toBeNull();
  expect(instance.tableManagerRef.current?.getSelectedItems()).toEqual([]);

  act(() => {
    triggerDeepLink('test2');
  });

  await sleep(1000);

  const current = instance.tableManagerRef.current;
  console.error('ref', current);
  expect(current?.getSelectedItems()).toEqual([
    {
      ...entry2,
      pidStr: '2',
      count: 1,
    },
  ]);

  act(() => {
    triggerMenuEntry('goToBottom');
  });
  expect(instance.tableManagerRef.current?.getSelectedItems()).toEqual([
    {
      ...entry3,
      pidStr: '0',
      count: 1,
    },
  ]);
});

test('export / import plugin does work', async () => {
  const {instance, exportStateAsync, sendLogEntry} =
    TestUtils.startDevicePlugin(LogsPlugin);

  sendLogEntry(entry1);
  sendLogEntry(entry2);

  const data = await exportStateAsync();
  expect(data).toMatchInlineSnapshot(`
    {
      "logs": [
        {
          "app": "X",
          "count": 1,
          "date": 2021-01-28T17:15:12.859Z,
          "message": "test1",
          "pid": 0,
          "pidStr": "0",
          "tag": "test",
          "tid": 1,
          "type": "error",
        },
        {
          "app": "Y",
          "count": 1,
          "date": 2021-01-28T17:15:17.859Z,
          "message": "test2",
          "pid": 2,
          "pidStr": "2",
          "tag": "test",
          "tid": 3,
          "type": "warn",
        },
      ],
    }
  `);

  expect(instance.rows.size).toBe(2);

  // Run a second import
  {
    const {exportStateAsync} = TestUtils.startDevicePlugin(LogsPlugin, {
      initialState: data,
    });

    expect(await exportStateAsync()).toEqual(data);
  }
});
