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

  // TODO T69105011 @ts-expect-error
  // p.bla;

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
