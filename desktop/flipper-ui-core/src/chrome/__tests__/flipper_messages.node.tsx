/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import * as React from 'react';
import {act, render} from '@testing-library/react';

import {
  clearFlipperDebugMessages,
  FlipperMessages,
  getFlipperDebugMessages,
  MessageRow,
  registerFlipperDebugMessage,
  setFlipperMessageDebuggingEnabled,
} from '../FlipperMessages';

const fixRowTimestamps = (r: MessageRow): MessageRow => ({
  ...r,
  time: new Date(Date.UTC(0, 0, 0, 0, 0, 0)),
});

beforeEach(() => {
  clearFlipperDebugMessages();
  setFlipperMessageDebuggingEnabled(true);
});

afterEach(() => {
  clearFlipperDebugMessages();
  setFlipperMessageDebuggingEnabled(false);
});

test('It can store rows', () => {
  registerFlipperDebugMessage({
    app: 'Flipper',
    direction: 'toFlipper:message',
  });

  registerFlipperDebugMessage({
    app: 'FB4A',
    direction: 'toClient:call',
    device: 'Android Phone',
    payload: {hello: 'world'},
  });

  setFlipperMessageDebuggingEnabled(false);

  registerFlipperDebugMessage({
    app: 'FB4A',
    direction: 'toClient:call',
    device: 'Android PhoneTEst',
    payload: {hello: 'world'},
  });

  expect(getFlipperDebugMessages().map(fixRowTimestamps))
    .toMatchInlineSnapshot(`
    Array [
      Object {
        "app": "Flipper",
        "direction": "toFlipper:message",
        "time": 1899-12-31T00:00:00.000Z,
      },
      Object {
        "app": "FB4A",
        "device": "Android Phone",
        "direction": "toClient:call",
        "payload": Object {
          "hello": "world",
        },
        "time": 1899-12-31T00:00:00.000Z,
      },
    ]
  `);
});

test('It can clear', () => {
  registerFlipperDebugMessage({
    app: 'Flipper',
    direction: 'toFlipper:message',
  });

  clearFlipperDebugMessages();
  expect(getFlipperDebugMessages()).toEqual([]);
});

test('It can render empty', async () => {
  const renderer = render(<FlipperMessages />);

  // Default message without any highlighted rows.
  expect(
    await renderer.findByText('Select a message to view details'),
  ).not.toBeNull();
  renderer.unmount();
});

test('It can render rows', async () => {
  const renderer = render(<FlipperMessages />);

  act(() => {
    registerFlipperDebugMessage({
      time: new Date(0, 0, 0, 0, 0, 0),
      app: 'Flipper',
      direction: 'toFlipper:message',
    });

    registerFlipperDebugMessage({
      time: new Date(0, 0, 0, 0, 0, 0),
      app: 'FB4A',
      direction: 'toClient:send',
      device: 'Android Phone',
      flipperInternalMethod: 'unique-string',
      payload: {hello: 'world'},
    });
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
        toClient:send
      </div>
    </div>
  `);

  renderer.unmount();
});
