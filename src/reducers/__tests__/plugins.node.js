/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {default as reducer, registerPlugins} from '../plugins';
import {
  FlipperBasePlugin,
  FlipperPlugin,
  FlipperDevicePlugin,
} from '../../plugin.js';

const testBasePlugin = class extends FlipperBasePlugin {
  static id = 'TestPlugin';
};

const testPlugin = class extends FlipperPlugin {
  static id = 'TestPlugin';
};

const testDevicePlugin = class extends FlipperDevicePlugin {
  static id = 'TestDevicePlugin';
};

test('add clientPlugin', () => {
  const res = reducer(
    {
      devicePlugins: new Map(),
      clientPlugins: new Map(),
    },
    registerPlugins([testPlugin]),
  );
  expect(res.clientPlugins.get(testPlugin.id)).toBe(testPlugin);
});

test('add devicePlugin', () => {
  const res = reducer(
    {
      devicePlugins: new Map(),
      clientPlugins: new Map(),
    },
    registerPlugins([testDevicePlugin]),
  );
  expect(res.devicePlugins.get(testDevicePlugin.id)).toBe(testDevicePlugin);
});

test('do not add plugin twice', () => {
  const res = reducer(
    {
      devicePlugins: new Map(),
      clientPlugins: new Map(),
    },
    registerPlugins([testPlugin, testPlugin]),
  );
  expect(res.clientPlugins.size).toEqual(1);
});

test('do not add other classes', () => {
  const res = reducer(
    {
      devicePlugins: new Map(),
      clientPlugins: new Map(),
    },
    // $FlowFixMe testing wrong classes on purpose here
    registerPlugins([testBasePlugin]),
  );
  expect(res.devicePlugins.size).toEqual(0);
  expect(res.devicePlugins.size).toEqual(0);
});
