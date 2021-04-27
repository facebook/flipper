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
  columns: {
    ...r.columns,
    time: {value: '00:13:37'},
  },
  timestamp: 0,
});

test('It can store rows', () => {
  const {instance, ...plugin} = TestUtils.startPlugin(Plugin);

  expect(instance.state.get().messageRows).toEqual([]);
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

  const newRows = instance.state.get().messageRows.map(fixRowTimestamps);
  expect(newRows).toMatchInlineSnapshot(`
    Array [
      Object {
        "columns": Object {
          "app": Object {
            "isFilterable": true,
            "value": "Flipper",
          },
          "device": Object {
            "isFilterable": true,
            "value": undefined,
          },
          "direction": Object {
            "isFilterable": true,
            "value": "toFlipper",
          },
          "internalMethod": Object {
            "isFilterable": true,
            "value": undefined,
          },
          "plugin": Object {
            "isFilterable": true,
            "value": undefined,
          },
          "pluginMethod": Object {
            "isFilterable": true,
            "value": undefined,
          },
          "time": Object {
            "value": "00:13:37",
          },
        },
        "key": "0",
        "payload": undefined,
        "timestamp": 0,
      },
      Object {
        "columns": Object {
          "app": Object {
            "isFilterable": true,
            "value": "FB4A",
          },
          "device": Object {
            "isFilterable": true,
            "value": "Android Phone",
          },
          "direction": Object {
            "isFilterable": true,
            "value": "toClient",
          },
          "internalMethod": Object {
            "isFilterable": true,
            "value": undefined,
          },
          "plugin": Object {
            "isFilterable": true,
            "value": undefined,
          },
          "pluginMethod": Object {
            "isFilterable": true,
            "value": undefined,
          },
          "time": Object {
            "value": "00:13:37",
          },
        },
        "key": "1",
        "payload": Object {
          "hello": "world",
        },
        "timestamp": 0,
      },
    ]
  `);
});

test('It can clear', () => {
  const {instance, ...plugin} = TestUtils.startPlugin(Plugin);

  expect(instance.state.get().messageRows).toEqual([]);
  expect(instance.highlightedRow.get()).toBeUndefined();

  plugin.sendEvent('newMessage', {
    app: 'Flipper',
    direction: 'toFlipper',
  });

  instance.clear();

  const newRows = instance.state.get().messageRows.map(fixRowTimestamps);
  expect(newRows).toEqual([]);
});

test('It can highlight a row', () => {
  const {instance, ...plugin} = TestUtils.startPlugin(Plugin);

  plugin.sendEvent('newMessage', {
    app: 'Flipper',
    direction: 'toFlipper',
  });

  instance.setHighlightedRow(['0', '1', '2']);

  expect(instance.highlightedRow.get()).toEqual('0');
});

test('It can render empty', async () => {
  const {renderer} = TestUtils.renderPlugin(Plugin);

  // Default message without any highlighted rows.
  expect(
    await renderer.findByText('Select a message to view details'),
  ).not.toBeNull();
});

// TODO(T82512981): Can't test much more right now until UI conversion has happened.
