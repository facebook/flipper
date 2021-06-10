/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {TestUtils} from 'flipper-plugin';

import * as Plugin from '../';
import {MessageRow} from '../';

const fixRowTimestamps = (r: MessageRow): MessageRow => ({
  ...r,
  time: new Date(Date.UTC(0, 0, 0, 0, 0, 0)),
});

test('It can store rows', () => {
  const {instance, ...plugin} = TestUtils.startPlugin(Plugin);

  expect(instance.rows.records()).toEqual([]);
  expect(instance.highlightedRow.get()).toBeUndefined();

  plugin.sendEvent('newMessage', {
    app: 'Flipper',
    direction: 'toFlipper',
  });

  plugin.sendEvent('newMessage', {
    app: 'FB4A',
    direction: 'toClient',
    device: 'Android Phone',
    payload: {hello: 'world'},
  });

  expect(instance.rows.records().map(fixRowTimestamps)).toMatchInlineSnapshot(`
    Array [
      Object {
        "app": "Flipper",
        "direction": "toFlipper",
        "time": 1899-12-31T00:00:00.000Z,
      },
      Object {
        "app": "FB4A",
        "device": "Android Phone",
        "direction": "toClient",
        "payload": Object {
          "hello": "world",
        },
        "time": 1899-12-31T00:00:00.000Z,
      },
    ]
  `);
});

test('It can clear', () => {
  const {instance, ...plugin} = TestUtils.startPlugin(Plugin);

  expect(instance.rows.records()).toEqual([]);
  expect(instance.highlightedRow.get()).toBeUndefined();

  plugin.sendEvent('newMessage', {
    app: 'Flipper',
    direction: 'toFlipper',
  });

  instance.clear();

  const newRows = instance.rows.records().map(fixRowTimestamps);
  expect(newRows).toEqual([]);
});

test('It can highlight a row', () => {
  const {instance, ...plugin} = TestUtils.startPlugin(Plugin);

  plugin.sendEvent('newMessage', {
    app: 'Flipper',
    direction: 'toFlipper',
  });

  instance.setHighlightedRow(instance.rows.records()[0]);

  expect(instance.rows.records()).toHaveLength(1);
  expect(instance.highlightedRow.get()?.app).toEqual('Flipper');
});

test('It can render empty', async () => {
  const {renderer} = TestUtils.renderPlugin(Plugin);

  // Default message without any highlighted rows.
  expect(
    await renderer.findByText('Select a message to view details'),
  ).not.toBeNull();
});

test('It can render rows', async () => {
  const {renderer, ...plugin} = TestUtils.renderPlugin(Plugin);

  plugin.sendEvent('newMessage', {
    time: new Date(0, 0, 0, 0, 0, 0),
    app: 'Flipper',
    direction: 'toFlipper',
  });

  plugin.sendEvent('newMessage', {
    time: new Date(0, 0, 0, 0, 0, 0),
    app: 'FB4A',
    direction: 'toClient',
    device: 'Android Phone',
    flipperInternalMethod: 'unique-string',
    payload: {hello: 'world'},
  });

  expect((await renderer.findByText('unique-string')).parentElement)
    .toMatchInlineSnapshot(`
    <div
      class="ant-dropdown-trigger css-1k3kr6b-TableBodyRowContainer e1luu51r1"
    >
      <div
        class="css-1vr131n-TableBodyColumnContainer e1luu51r0"
        width="14%"
      >
        00:00:00.000
      </div>
      <div
        class="css-1vr131n-TableBodyColumnContainer e1luu51r0"
        width="14%"
      >
        Android Phone
      </div>
      <div
        class="css-1vr131n-TableBodyColumnContainer e1luu51r0"
        width="14%"
      >
        FB4A
      </div>
      <div
        class="css-1vr131n-TableBodyColumnContainer e1luu51r0"
        width="14%"
      >
        unique-string
      </div>
      <div
        class="css-1vr131n-TableBodyColumnContainer e1luu51r0"
        width="14%"
      />
      <div
        class="css-1vr131n-TableBodyColumnContainer e1luu51r0"
        width="14%"
      />
      <div
        class="css-1vr131n-TableBodyColumnContainer e1luu51r0"
        width="14%"
      >
        toClient
      </div>
    </div>
  `);
});
