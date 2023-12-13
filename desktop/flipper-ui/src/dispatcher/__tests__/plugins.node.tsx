/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import dispatcher, {
  checkDisabled,
  checkGK,
  requirePluginInternal,
} from '../plugins';
import {InstalledPluginDetails} from 'flipper-common';
import {createRootReducer, State} from '../../reducers/index';
import {getLogger} from 'flipper-common';
import configureStore from 'redux-mock-store';
import {_SandyPluginDefinition} from 'flipper-plugin';
import {getFlipperServer} from '../../flipperServer';
import {createRequirePluginFunction} from '../plugins';
import {getLatestCompatibleVersionOfEachPlugin} from '../../utils/pluginUtils';

const sampleInstalledPluginDetails: InstalledPluginDetails = {
  name: 'other Name',
  version: '1.0.0',
  specVersion: 2,
  main: 'dist/bundle.js',
  source: 'src/index.js',
  id: 'Sample',
  title: 'Sample',
  dir: '/Users/mock/.flipper/thirdparty/flipper-plugin-sample',
  entry: 'this/path/does not/exist',
  isActivatable: true,
  flipperSDKVersion: '0.0.0',
  pluginType: 'device',
};

const mockPluginSource = `"use strict";var f=Object.create;var e=Object.defineProperty;var m=Object.getOwnPropertyDescriptor;var c=Object.getOwnPropertyNames;var x=Object.getPrototypeOf,d=Object.prototype.hasOwnProperty;var g=(n,o)=>{for(var r in o)e(n,r,{get:o[r],enumerable:!0})},p=(n,o,r,u)=>{if(o&&typeof o=="object"||typeof o=="function")for(let t of c(o))!d.call(n,t)&&t!==r&&e(n,t,{get:()=>o[t],enumerable:!(u=m(o,t))||u.enumerable});return n};var l=(n,o,r)=>(r=n!=null?f(x(n)):{},p(o||!n||!n.__esModule?e(r,"default",{value:n,enumerable:!0}):r,n)),v=n=>p(e({},"__esModule",{value:!0}),n);var b={};g(b,{Component:()=>P,devicePlugin:()=>C});module.exports=v(b);var i=l(require("react"));function C(){return 42}function P(){return i.default.createElement(i.default.Fragment,null)}`;

beforeEach(() => {
  getFlipperServer().exec = jest.fn().mockImplementation((command) => {
    if (command === 'plugin-source') {
      return {js: mockPluginSource};
    }
    return [];
  });
});

test('checkDisabled', () => {
  const disabledPlugin = 'pluginName';
  const hostConfig = {
    processConfig: {
      disabledPlugins: [disabledPlugin],
    },
    env: {},
  } as any;
  const disabled = checkDisabled([], hostConfig);

  expect(
    disabled({
      ...sampleInstalledPluginDetails,
      name: 'other Name',
      version: '1.0.0',
    }),
  ).toBeTruthy();
  expect(
    disabled({
      ...sampleInstalledPluginDetails,
      name: disabledPlugin,
      version: '1.0.0',
    }),
  ).toBeFalsy();
});

test('checkGK for plugin without GK', () => {
  expect(
    checkGK([])({
      ...sampleInstalledPluginDetails,
      name: 'pluginID',
      version: '1.0.0',
    }),
  ).toBeTruthy();
});

test('checkGK for passing plugin', () => {
  expect(
    checkGK([])({
      ...sampleInstalledPluginDetails,
      name: 'pluginID',
      gatekeeper: 'TEST_PASSING_GK',
      version: '1.0.0',
    }),
  ).toBeTruthy();
});

test('checkGK for failing plugin', () => {
  const gatekeepedPlugins: InstalledPluginDetails[] = [];
  const name = 'pluginID';
  const plugins = checkGK(gatekeepedPlugins)({
    ...sampleInstalledPluginDetails,
    name,
    gatekeeper: 'TEST_FAILING_GK',
    version: '1.0.0',
  });

  expect(plugins).toBeFalsy();
  expect(gatekeepedPlugins[0].name).toEqual(name);
});

test('requirePlugin returns null for invalid requires', async () => {
  const requireFn = createRequirePluginFunction(() => {
    throw new Error();
  });
  const plugin = await requireFn([])({
    ...sampleInstalledPluginDetails,
    name: 'pluginID',
    dir: '/Users/mock/.flipper/thirdparty/flipper-plugin-sample',
    entry: 'this/path/does not/exist',
    version: '1.0.0',
  });

  expect(plugin).toBeNull();
});

test('newest version of each plugin is used', () => {
  const sourcePlugins: InstalledPluginDetails[] = [
    {
      ...sampleInstalledPluginDetails,
      id: 'TestPlugin1',
      name: 'flipper-plugin-test1',
      version: '0.1.0',
    },
    {
      ...sampleInstalledPluginDetails,
      id: 'TestPlugin2',
      name: 'flipper-plugin-test2',
      version: '0.1.0-alpha.201',
    },
  ];
  const installedPlugins: InstalledPluginDetails[] = [
    {
      ...sampleInstalledPluginDetails,
      id: 'TestPlugin2',
      name: 'flipper-plugin-test2',
      version: '0.1.0-alpha.21',
      dir: '/Users/mock/.flipper/thirdparty/flipper-plugin-test2',
      entry: './test/index.js',
    },
    {
      ...sampleInstalledPluginDetails,
      id: 'TestPlugin1',
      name: 'flipper-plugin-test1',
      version: '0.10.0',
      dir: '/Users/mock/.flipper/thirdparty/flipper-plugin-test1',
      entry: './test/index.js',
    },
  ];
  const filteredPlugins = getLatestCompatibleVersionOfEachPlugin([
    ...sourcePlugins,
    ...installedPlugins,
  ]);
  expect(filteredPlugins).toHaveLength(2);
  expect(filteredPlugins).toContainEqual({
    ...sampleInstalledPluginDetails,
    id: 'TestPlugin1',
    name: 'flipper-plugin-test1',
    version: '0.10.0',
    dir: '/Users/mock/.flipper/thirdparty/flipper-plugin-test1',
    entry: './test/index.js',
  });
  expect(filteredPlugins).toContainEqual({
    ...sampleInstalledPluginDetails,
    id: 'TestPlugin2',
    name: 'flipper-plugin-test2',
    version: '0.1.0-alpha.201',
  });
});

test('dispatcher dispatches REGISTER_PLUGINS', async () => {
  const mockStore = configureStore<State, {}>([])(
    createRootReducer()(undefined, {type: 'INIT'}),
  );
  const logger = getLogger();

  await dispatcher(mockStore, logger);
  const actions = mockStore.getActions();
  expect(actions.map((a) => a.type)).toContain('REGISTER_PLUGINS');
});

test('requirePluginInternal loads plugin', async () => {
  const requireFn = createRequirePluginFunction(requirePluginInternal)([]);
  const plugin = await requireFn(sampleInstalledPluginDetails);
  expect(plugin).not.toBeNull();
  expect(plugin?.asDevicePluginModule().devicePlugin({} as any)).toBe(42);
});
