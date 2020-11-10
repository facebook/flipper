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
import {
  findBestClient,
  findBestDevice,
  findMetroDevice,
  computePluginLists,
} from '../PluginList';
import {FlipperPlugin} from '../../../plugin';
import MetroDevice from '../../../devices/MetroDevice';
import BaseDevice from '../../../devices/BaseDevice';
import {SandyPluginDefinition} from 'flipper-plugin';
import {createMockPluginDetails} from 'flipper-plugin/src/test-utils/test-utils';
import {selectPlugin, starPlugin} from '../../../reducers/connections';
import {registerMetroDevice} from '../../../dispatcher/metroDevice';
import {addGatekeepedPlugins, registerPlugins} from '../../../reducers/plugins';

// eslint-disable-next-line
import * as LogsPluginModule from '../../../../../plugins/logs/index';

const logsPlugin = new SandyPluginDefinition(
  createMockPluginDetails({id: 'DeviceLogs'}),
  LogsPluginModule,
);

class TestPlugin extends FlipperPlugin<any, any, any> {}

describe('basic findBestDevice', () => {
  let flipper: MockFlipperResult;
  beforeEach(async () => {
    flipper = await createMockFlipperWithPlugin(TestPlugin);
  });

  test('findBestDevice prefers selected device', () => {
    const {client, device} = flipper;
    const {connections} = flipper.store.getState();
    expect(
      findBestDevice(
        client,
        connections.devices,
        device,
        undefined,
        device.title,
      ),
    ).toBe(device);
  });

  test('findBestDevice picks device of current client', () => {
    const {client, device} = flipper;
    const {connections} = flipper.store.getState();
    expect(
      findBestDevice(client, connections.devices, null, undefined, null),
    ).toBe(device);
  });

  test('findBestDevice picks preferred device if no client and device', () => {
    const {device} = flipper;
    const {connections} = flipper.store.getState();
    expect(
      findBestDevice(
        undefined,
        connections.devices,
        null,
        undefined,
        device.title,
      ),
    ).toBe(device);
  });
});

describe('basic findBestDevice with metro present', () => {
  let flipper: MockFlipperResult;
  let metro: MetroDevice;
  let testDevice: BaseDevice;

  beforeEach(async () => {
    flipper = await createMockFlipperWithPlugin(logsPlugin);
    testDevice = flipper.device;
    // flipper.store.dispatch(registerPlugins([LogsPlugin]))
    await registerMetroDevice(undefined, flipper.store, flipper.logger);
    metro = findMetroDevice(
      flipper.store.getState().connections.devices,
    )! as MetroDevice;
  });

  test('findMetroDevice', () => {
    expect(metro).toBeInstanceOf(MetroDevice);
  });

  test('correct base selection state', () => {
    const {connections} = flipper.store.getState();
    expect(connections).toMatchObject({
      devices: [testDevice, metro],
      selectedDevice: testDevice,
      selectedPlugin: 'DeviceLogs',
      userPreferredDevice: 'MockAndroidDevice',
      userPreferredPlugin: 'DeviceLogs',
      userPreferredApp: 'TestApp#Android#MockAndroidDevice#serial',
    });
    expect(
      findBestClient(
        connections.clients,
        connections.selectedApp,
        connections.userPreferredApp,
      ),
    ).toBe(flipper.client);
  });

  test('selecting Metro Logs works but keeps normal device preferred', () => {
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
    const {connections} = flipper.store.getState();
    // find best device is still metro
    expect(
      findBestDevice(
        undefined,
        connections.devices,
        connections.selectedDevice,
        metro,
        connections.userPreferredDevice,
      ),
    ).toBe(testDevice);
    // find best client still returns app
    expect(
      findBestClient(
        connections.clients,
        connections.selectedApp,
        connections.userPreferredApp,
      ),
    ).toBe(flipper.client);
  });

  test('computePluginLists', () => {
    const state = flipper.store.getState();
    expect(
      computePluginLists(
        testDevice,
        metro,
        flipper.client,
        state.plugins,
        state.connections.userStarredPlugins,
      ),
    ).toEqual({
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

    const unsupportedDevicePlugin = new SandyPluginDefinition(
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

    const unsupportedPlugin = new SandyPluginDefinition(
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

    const plugin1 = new SandyPluginDefinition(
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

    const plugin2 = new SandyPluginDefinition(
      createMockPluginDetails({
        id: 'plugin2',
        title: 'Plugin 2',
      }),
      noopPlugin,
    );

    flipper.store.dispatch(
      registerPlugins([
        unsupportedDevicePlugin,
        unsupportedPlugin,
        plugin1,
        plugin2,
      ]),
    );
    flipper.store.dispatch(addGatekeepedPlugins([gateKeepedPlugin]));

    // ok, this is a little hackish
    flipper.client.plugins = ['plugin1', 'plugin2'];

    let state = flipper.store.getState();
    expect(
      computePluginLists(
        testDevice,
        metro,
        flipper.client,
        state.plugins,
        state.connections.userStarredPlugins,
      ),
    ).toEqual({
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
          "Device plugin 'Unsupported Device Plugin' is not supported by the current device type.",
        ],
        [
          unsupportedPlugin.details,
          "Plugin 'Unsupported Plugin' is not loaded by the client application",
        ],
      ],
    });

    flipper.store.dispatch(
      starPlugin({
        plugin: plugin2,
        selectedApp: flipper.client.query.app,
      }),
    );
    state = flipper.store.getState();
    expect(
      computePluginLists(
        testDevice,
        metro,
        flipper.client,
        state.plugins,
        state.connections.userStarredPlugins,
      ),
    ).toMatchObject({
      enabledPlugins: [plugin2],
      disabledPlugins: [plugin1],
    });
  });
});
