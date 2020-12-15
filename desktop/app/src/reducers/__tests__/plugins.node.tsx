/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  default as reducer,
  registerPlugins,
  addGatekeepedPlugins,
} from '../plugins';
import {FlipperPlugin, FlipperDevicePlugin, BaseAction} from '../../plugin';
import {InstalledPluginDetails} from 'flipper-plugin-lib';

const testPlugin = class extends FlipperPlugin<any, BaseAction, any> {
  static id = 'TestPlugin';
};

const testDevicePlugin = class extends FlipperDevicePlugin<
  any,
  BaseAction,
  any
> {
  static id = 'TestDevicePlugin';
};

test('add clientPlugin', () => {
  const res = reducer(
    {
      devicePlugins: new Map(),
      clientPlugins: new Map(),
      loadedPlugins: new Map(),
      gatekeepedPlugins: [],
      failedPlugins: [],
      disabledPlugins: [],
      selectedPlugins: [],
      marketplacePlugins: [],
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
      loadedPlugins: new Map(),
      gatekeepedPlugins: [],
      failedPlugins: [],
      disabledPlugins: [],
      selectedPlugins: [],
      marketplacePlugins: [],
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
      loadedPlugins: new Map(),
      gatekeepedPlugins: [],
      failedPlugins: [],
      disabledPlugins: [],
      selectedPlugins: [],
      marketplacePlugins: [],
    },
    registerPlugins([testPlugin, testPlugin]),
  );
  expect(res.clientPlugins.size).toEqual(1);
});

test('add gatekeeped plugin', () => {
  const gatekeepedPlugins: InstalledPluginDetails[] = [
    {
      name: 'plugin',
      version: '1.0.0',
      dir: '/plugins/test',
      specVersion: 2,
      source: 'src/index.ts',
      isBundled: false,
      isActivatable: true,
      main: 'lib/index.js',
      title: 'test',
      id: 'test',
      entry: '/plugins/test/lib/index.js',
    },
  ];
  const res = reducer(
    {
      devicePlugins: new Map(),
      clientPlugins: new Map(),
      loadedPlugins: new Map(),
      gatekeepedPlugins: [],
      failedPlugins: [],
      disabledPlugins: [],
      selectedPlugins: [],
      marketplacePlugins: [],
    },
    addGatekeepedPlugins(gatekeepedPlugins),
  );
  expect(res.gatekeepedPlugins).toEqual(gatekeepedPlugins);
});
