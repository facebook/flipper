/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {
  default as reducer,
  registerPlugins,
  addGatekeepedPlugins,
} from '../plugins';
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
      gatekeepedPlugins: [],
      failedPlugins: [],
      disabledPlugins: [],
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
      gatekeepedPlugins: [],
      failedPlugins: [],
      disabledPlugins: [],
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
      gatekeepedPlugins: [],
      failedPlugins: [],
      disabledPlugins: [],
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
      gatekeepedPlugins: [],
      failedPlugins: [],
      disabledPlugins: [],
    },
    // $FlowFixMe testing wrong classes on purpose here
    registerPlugins([testBasePlugin]),
  );
  expect(res.devicePlugins.size).toEqual(0);
  expect(res.devicePlugins.size).toEqual(0);
});

test('add gatekeeped plugin', () => {
  const gatekeepedPlugins = [{name: 'plugin', out: 'out.js'}];
  const res = reducer(
    {
      devicePlugins: new Map(),
      clientPlugins: new Map(),
      gatekeepedPlugins: [],
      failedPlugins: [],
      disabledPlugins: [],
    },
    addGatekeepedPlugins(gatekeepedPlugins),
  );
  expect(res.gatekeepedPlugins).toEqual(gatekeepedPlugins);
});
