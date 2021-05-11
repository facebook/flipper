/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import * as TestUtils from '../test-utils/test-utils';
import * as testPlugin from './DeviceTestPlugin';
import {createState} from '../state/atom';

const testLogMessage = {
  date: new Date(),
  message: 'test',
  pid: 0,
  tid: 0,
  tag: 'bla',
  type: 'warn',
  app: 'TestApp',
} as const;

test('it can start a device plugin and listen to lifecycle events', () => {
  const {instance, ...p} = TestUtils.startDevicePlugin(testPlugin);

  // @ts-expect-error
  p.bla;
  // @ts-expect-error
  instance.bla;

  // startPlugin starts activated
  expect(instance.activateStub).toBeCalledTimes(1);
  expect(instance.deactivateStub).toBeCalledTimes(0);
  expect(instance.destroyStub).toBeCalledTimes(0);

  // calling activate is a noop
  p.activate();
  expect(instance.activateStub).toBeCalledTimes(1);
  expect(instance.deactivateStub).toBeCalledTimes(0);
  expect(instance.destroyStub).toBeCalledTimes(0);

  p.sendLogEntry(testLogMessage);
  expect(instance.logStub).toBeCalledWith(testLogMessage);
  expect(instance.state.get().count).toBe(1);

  expect(instance.activateStub).toBeCalledTimes(1);
  expect(instance.deactivateStub).toBeCalledTimes(0);
  expect(instance.destroyStub).toBeCalledTimes(0);

  p.deactivate();
  p.activate();

  expect(instance.activateStub).toBeCalledTimes(2);
  expect(instance.deactivateStub).toBeCalledTimes(1);
  expect(instance.destroyStub).toBeCalledTimes(0);

  p.destroy();
  expect(instance.activateStub).toBeCalledTimes(2);
  expect(instance.deactivateStub).toBeCalledTimes(2);
  expect(instance.destroyStub).toBeCalledTimes(1);

  // cannot interact with destroyed plugin
  expect(() => {
    p.activate();
  }).toThrowErrorMatchingInlineSnapshot(`"Plugin has been destroyed already"`);
});

test('it can render a device plugin', () => {
  const {renderer, instance, sendLogEntry} =
    TestUtils.renderDevicePlugin(testPlugin);

  expect(renderer.baseElement).toMatchInlineSnapshot(`
    <body>
      <div>
        <h1>
          Hi from test plugin 
          0
        </h1>
      </div>
    </body>
  `);

  sendLogEntry(testLogMessage);

  expect(renderer.baseElement).toMatchInlineSnapshot(`
    <body>
      <div>
        <h1>
          Hi from test plugin 
          1
        </h1>
      </div>
    </body>
  `);

  // @ts-ignore
  expect(instance.state.listeners.length).toBe(1);
  renderer.unmount();
  // @ts-ignore
  expect(instance.state.listeners.length).toBe(0);
});

test('device plugins support non-serializable state', async () => {
  const {exportState} = TestUtils.startPlugin({
    plugin() {
      const field1 = createState(true);
      const field2 = createState(
        {
          test: 3,
        },
        {
          persist: 'field2',
        },
      );
      return {
        field1,
        field2,
      };
    },
    Component() {
      return null;
    },
  });
  // states are serialized in creation order
  expect(exportState()).toEqual({field2: {test: 3}});
});

test('device plugins support restoring state', async () => {
  const {exportState, instance} = TestUtils.startPlugin(
    {
      plugin() {
        const field1 = createState(1, {persist: 'field1'});
        const field2 = createState(2);
        const field3 = createState(3, {persist: 'field3'});
        return {field1, field2, field3};
      },
      Component() {
        return null;
      },
    },
    {
      initialState: {field1: 'a', field3: 'b'},
    },
  );

  const {field1, field2, field3} = instance;
  expect(field1.get()).toBe('a');
  expect(field2.get()).toBe(2);
  expect(field3.get()).toBe('b');
  expect(exportState()).toEqual({field1: 'a', field3: 'b'});
});
