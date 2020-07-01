/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import * as TestUtils from '../test-utils/test-utils';
import * as testPlugin from './TestPlugin';

test('it can start a plugin and lifecycle events', () => {
  const {instance, ...p} = TestUtils.startPlugin(testPlugin);

  // @ts-expect-error
  p.bla;
  // @ts-expect-error
  instance.bla;

  // startPlugin starts connected
  expect(instance.connectStub).toBeCalledTimes(1);
  expect(instance.disconnectStub).toBeCalledTimes(0);
  expect(instance.destroyStub).toBeCalledTimes(0);

  p.connect(); // noop
  expect(instance.connectStub).toBeCalledTimes(1);
  expect(instance.disconnectStub).toBeCalledTimes(0);
  expect(instance.destroyStub).toBeCalledTimes(0);

  p.disconnect();
  p.connect();

  expect(instance.connectStub).toBeCalledTimes(2);
  expect(instance.disconnectStub).toBeCalledTimes(1);
  expect(instance.destroyStub).toBeCalledTimes(0);

  p.destroy();
  expect(instance.connectStub).toBeCalledTimes(2);
  expect(instance.disconnectStub).toBeCalledTimes(2);
  expect(instance.destroyStub).toBeCalledTimes(1);

  // cannot interact with destroyed plugin
  expect(() => {
    p.connect();
  }).toThrowErrorMatchingInlineSnapshot(`"Plugin has been destroyed already"`);
});

test('it can render a plugin', () => {
  const {renderer} = TestUtils.renderPlugin(testPlugin);

  expect(renderer.baseElement).toMatchInlineSnapshot(`
    <body>
      <div>
        <h1>
          Hi from test plugin
        </h1>
      </div>
    </body>
  `);
  // TODO: test sending updates T68683442
});

test('a plugin can send messages', async () => {
  const {instance, onSend} = TestUtils.startPlugin(testPlugin);

  // By default send is stubbed
  expect(await instance.getCurrentState()).toBeUndefined();
  expect(onSend).toHaveBeenCalledWith('currentState', {since: 0});

  // @ts-expect-error
  onSend('bla');

  // ... But we can intercept!
  onSend.mockImplementationOnce(async (method, params) => {
    expect(method).toEqual('currentState');
    expect(params).toEqual({since: 0});
    return 3;
  });
  expect(await instance.getCurrentState()).toEqual(3);
});

test('a plugin cannot send messages after being disconnected', async () => {
  const {instance, disconnect} = TestUtils.startPlugin(testPlugin);

  disconnect();
  let threw = false;
  try {
    await instance.getCurrentState();
  } catch (e) {
    threw = true; // for some weird reason expect(async () => instance.getCurrentState()).toThrow(...) doesn't work today...
    expect(e).toMatchInlineSnapshot(`[Error: Plugin is not connected]`);
  }
  expect(threw).toBeTruthy();
});
