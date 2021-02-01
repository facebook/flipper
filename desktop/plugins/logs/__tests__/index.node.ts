/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {sleep, TestUtils} from 'flipper-plugin';
import {addEntriesToState, processEntry} from '../index';
import {DeviceLogEntry} from 'flipper';
import * as LogsPlugin from '../index';

const entry: DeviceLogEntry = {
  tag: 'OpenGLRenderer',
  pid: 18384,
  tid: 18409,
  message: 'Swap behavior 1',
  date: new Date('Feb 28 2013 19:00:00 EST'),
  type: 'debug',
};

test('processEntry', () => {
  const key = 'key';
  const processedEntry = processEntry(entry, key);
  expect(processedEntry.entry).toEqual(entry);
  expect(processedEntry.row.key).toBe(key);
  expect(typeof processedEntry.row.height).toBe('number');
});

test('addEntriesToState without current state', () => {
  const processedEntry = processEntry(entry, 'key');
  const newState = addEntriesToState([processedEntry]);

  expect(newState.rows.length).toBe(1);
  expect(newState.entries.length).toBe(1);
  expect(newState.entries[0]).toEqual(processedEntry);
});

test('addEntriesToState with current state', () => {
  const firstProcessedEntry = processEntry(entry, 'key1');
  const currentState = addEntriesToState([firstProcessedEntry]);
  const secondProcessedEntry = processEntry(
    {
      ...entry,
      message: 'new message',
    },
    'key2',
  );
  const newState = addEntriesToState([secondProcessedEntry], currentState);
  expect(newState.entries.length).toBe(2);
  expect(newState.rows.length).toBe(2);
  expect(newState.rows[0]).toEqual(firstProcessedEntry.row);
  expect(newState.rows[1]).toEqual(secondProcessedEntry.row);
});

test('addEntriesToState increase counter on duplicate message', () => {
  const currentState = addEntriesToState([processEntry(entry, 'key1')]);
  const processedEntry = processEntry(entry, 'key2');
  const newState = addEntriesToState([processedEntry], currentState);
  expect(newState.rows.length).toBe(1);
  expect(newState.entries.length).toBe(2);
  expect(newState.rows[0].columns.type.value.props.children).toBe(2);
});

test('addEntriesToState with reversed direction (add to front)', () => {
  const firstProcessedEntry = processEntry(entry, 'key1');
  const currentState = addEntriesToState([firstProcessedEntry]);
  expect(currentState.rows.length).toBe(1);
  expect(currentState.entries.length).toBe(1);
  const secondProcessedEntry = processEntry(
    {
      ...entry,
      message: 'second message',
      date: new Date('Feb 28 2013 19:01:00 EST'),
    },
    'key2',
  );
  const newState = addEntriesToState(
    [secondProcessedEntry],
    currentState,
    'down',
  );
  expect(newState.entries.length).toBe(2);
  expect(newState.rows.length).toBe(2);
});

test('export / import plugin does work', async () => {
  const {
    instance,
    exportStateAsync,
    sendLogEntry,
  } = TestUtils.startDevicePlugin(LogsPlugin);

  sendLogEntry({
    date: new Date(1611854112859),
    message: 'test1',
    pid: 0,
    tag: 'test',
    tid: 1,
    type: 'error',
    app: 'X',
  });
  sendLogEntry({
    date: new Date(1611854117859),
    message: 'test2',
    pid: 2,
    tag: 'test',
    tid: 3,
    type: 'warn',
    app: 'Y',
  });

  // batching and storage is async atm
  await sleep(500);

  const data = await exportStateAsync();
  expect(data).toMatchInlineSnapshot(`
    Object {
      "logs": Array [
        Object {
          "app": "X",
          "date": 1611854112859,
          "message": "test1",
          "pid": 0,
          "tag": "test",
          "tid": 1,
          "type": "error",
        },
        Object {
          "app": "Y",
          "date": 1611854117859,
          "message": "test2",
          "pid": 2,
          "tag": "test",
          "tid": 3,
          "type": "warn",
        },
      ],
    }
  `);

  expect(instance.rows.get().length).toBe(2);

  // Run a second import
  {
    const {exportStateAsync} = TestUtils.startDevicePlugin(LogsPlugin, {
      initialState: data,
    });

    expect(await exportStateAsync()).toEqual(data);
  }
});
