/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  createMockFlipperWithPlugin,
  MockFlipperResult,
} from '../../../test-utils/createMockFlipperWithPlugin';
import {FlipperPlugin} from '../../../plugin';
import MetroDevice from '../../../devices/MetroDevice';
import BaseDevice from '../../../devices/BaseDevice';
import {_SandyPluginDefinition} from 'flipper-plugin';
import {TestUtils} from 'flipper-plugin';
import {selectPlugin} from '../../../reducers/connections';
import {registerMetroDevice} from '../../../dispatcher/metroDevice';
import {
  addGatekeepedPlugins,
  registerMarketplacePlugins,
  registerPlugins,
} from '../../../reducers/plugins';
import {switchPlugin} from '../../../reducers/pluginManager';

// eslint-disable-next-line
import * as LogsPluginModule from '../../../../../plugins/public/logs/index';
import {createMockDownloadablePluginDetails} from '../../../utils/testUtils';
import {
  getActiveClient,
  getActiveDevice,
  getMetroDevice,
  getPluginLists,
} from '../../../selectors/connections';

const createMockPluginDetails = TestUtils.createMockPluginDetails;

const logsPlugin = new _SandyPluginDefinition(
  createMockPluginDetails({id: 'DeviceLogs'}),
  LogsPluginModule,
);

class TestPlugin extends FlipperPlugin<any, any, any> {}

describe('basic getActiveDevice', () => {
  let flipper: MockFlipperResult;
  beforeEach(async () => {
    flipper = await createMockFlipperWithPlugin(TestPlugin);
  });

  test('getActiveDevice prefers selected device', () => {
    const {device, store} = flipper;
    expect(getActiveDevice(store.getState())).toBe(device);
  });

  test('getActiveDevice picks device of current client', () => {
    const {device, store} = flipper;
    expect(getActiveDevice(store.getState())).toBe(device);
  });

  test('getActiveDevice picks preferred device if no client and device', () => {
    const {device, store} = flipper;
    expect(getActiveDevice(store.getState())).toBe(device);
  });
});

describe('basic getActiveDevice with metro present', () => {
  let flipper: MockFlipperResult;
  let metro: MetroDevice;
  let testDevice: BaseDevice;

  beforeEach(async () => {
    flipper = await createMockFlipperWithPlugin(logsPlugin);
    flipper.device.supportsPlugin = (p) => {
      return p.id !== 'unsupportedDevicePlugin';
    };
    testDevice = flipper.device;
    // flipper.store.dispatch(registerPlugins([LogsPlugin]))
    await registerMetroDevice(undefined, flipper.store, flipper.logger);
    metro = getMetroDevice(flipper.store.getState())!;
    metro.supportsPlugin = (p) => {
      return p.id !== 'unsupportedDevicePlugin';
    };
  });

  test('findMetroDevice', () => {
    expect(metro).toBeInstanceOf(MetroDevice);
  });

  test('correct base selection state', () => {
    const state = flipper.store.getState();
    const {connections} = state;
    expect(connections).toMatchObject({
      devices: [testDevice, metro],
      selectedDevice: testDevice,
      selectedPlugin: 'DeviceLogs',
      userPreferredDevice: 'MockAndroidDevice',
      userPreferredPlugin: 'DeviceLogs',
      userPreferredApp: 'TestApp#Android#MockAndroidDevice#serial',
    });
    expect(getActiveClient(state)).toBe(flipper.client);
  });

  test('selecting Metro Logs works but keeps normal device preferred', () => {
    expect(getActiveClient(flipper.store.getState())).toBe(flipper.client);
    flipper.store.dispatch(
      selectPlugin({
        selectedPlugin: logsPlugin.id,
        selectedApp: null,
        selectedDevice: metro,
        deepLinkPayload: null,
      }),
    );
    expect(flipper.store.getState().connections).toMatchObject({
      devices: [testDevice, metro],
      selectedApp: null,
      selectedDevice: metro,
      selectedPlugin: 'DeviceLogs',
      userPreferredDevice: 'MockAndroidDevice', // Not metro!
      userPreferredPlugin: 'DeviceLogs',
      userPreferredApp: 'TestApp#Android#MockAndroidDevice#serial',
    });
    const state = flipper.store.getState();
    // find best device is still metro
    expect(getActiveDevice(state)).toBe(testDevice);
    // find best client still returns app
    expect(getActiveClient(state)).toBe(flipper.client);
  });

  test('computePluginLists', () => {
    const state = flipper.store.getState();
    expect(getPluginLists(state)).toEqual({
      downloadablePlugins: [],
      devicePlugins: [logsPlugin],
      metroPlugins: [logsPlugin],
      enabledPlugins: [],
      disabledPlugins: [],
      unavailablePlugins: [],
    });
  });

  test('computePluginLists with problematic plugins', () => {
    const noopPlugin = {
      plugin() {},
      Component() {
        return null;
      },
    };

    const unsupportedDevicePlugin = new _SandyPluginDefinition(
      createMockPluginDetails({
        id: 'unsupportedDevicePlugin',
        title: 'Unsupported Device Plugin',
      }),
      {
        devicePlugin() {
          return {};
        },
        supportsDevice() {
          return false;
        },
        Component() {
          return null;
        },
      },
    );
    const unsupportedPlugin = new _SandyPluginDefinition(
      createMockPluginDetails({
        id: 'unsupportedPlugin',
        title: 'Unsupported Plugin',
      }),
      noopPlugin,
    );

    const gateKeepedPlugin = createMockPluginDetails({
      id: 'gateKeepedPlugin',
      title: 'Gatekeeped Plugin',
      gatekeeper: 'not for you',
    });

    const plugin1 = new _SandyPluginDefinition(
      createMockPluginDetails({
        id: 'plugin1',
        title: 'Plugin 1',
      }),
      {
        plugin() {},
        Component() {
          return null;
        },
      },
    );

    const plugin2 = new _SandyPluginDefinition(
      createMockPluginDetails({
        id: 'plugin2',
        title: 'Plugin 2',
      }),
      noopPlugin,
    );

    const supportedDownloadablePlugin = createMockDownloadablePluginDetails({
      id: 'supportedUninstalledPlugin',
      title: 'Supported Uninstalled Plugin',
    });

    const unsupportedDownloadablePlugin = createMockDownloadablePluginDetails({
      id: 'unsupportedUninstalledPlugin',
      title: 'Unsupported Uninstalled Plugin',
    });

    flipper.store.dispatch(
      registerPlugins([
        unsupportedDevicePlugin,
        unsupportedPlugin,
        plugin1,
        plugin2,
      ]),
    );
    flipper.store.dispatch(addGatekeepedPlugins([gateKeepedPlugin]));
    flipper.store.dispatch(
      registerMarketplacePlugins([
        supportedDownloadablePlugin,
        unsupportedDownloadablePlugin,
      ]),
    );

    // ok, this is a little hackish
    flipper.client.plugins = new Set([
      'plugin1',
      'plugin2',
      'supportedUninstalledPlugin',
    ]);

    let state = flipper.store.getState();
    const pluginLists = getPluginLists(state);
    expect(pluginLists).toEqual({
      devicePlugins: [logsPlugin],
      metroPlugins: [logsPlugin],
      enabledPlugins: [],
      disabledPlugins: [plugin1, plugin2],
      unavailablePlugins: [
        [
          gateKeepedPlugin,
          "This plugin is only available to members of gatekeeper 'not for you'",
        ],
        [
          unsupportedDevicePlugin.details,
          "Device plugin 'Unsupported Device Plugin' is not supported by the currently connected device.",
        ],
        [
          unsupportedPlugin.details,
          "Plugin 'Unsupported Plugin' is not supported by the client application",
        ],
        [
          unsupportedDownloadablePlugin,
          "Plugin 'Unsupported Uninstalled Plugin' is not supported by the client application and not installed in Flipper",
        ],
      ],
      downloadablePlugins: [supportedDownloadablePlugin],
    });

    flipper.store.dispatch(
      switchPlugin({
        plugin: plugin2,
        selectedApp: flipper.client.query.app,
      }),
    );
    state = flipper.store.getState();
    expect(getPluginLists(state)).toMatchObject({
      enabledPlugins: [plugin2],
      disabledPlugins: [plugin1],
    });
  });
});
