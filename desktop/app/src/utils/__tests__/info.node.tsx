/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Store} from '../../reducers/index';
import {createStore} from 'redux';
import {createRootReducer} from '../../reducers';
import initialize, {getInfo} from '../info';
import {registerLoadedPlugins} from '../../reducers/plugins';
import {TestUtils} from 'flipper-plugin';
import {getInstance} from '../../fb-stubs/Logger';
import {selectPlugin} from '../../reducers/connections';
import {renderMockFlipperWithPlugin} from '../../test-utils/createMockFlipperWithPlugin';

const networkPluginDetails = TestUtils.createMockPluginDetails({
  id: 'Network',
  name: 'flipper-plugin-network',
  version: '0.78.0',
  dir: '/plugins/public/network',
  pluginType: 'client',
});

const inspectorPluginDetails = TestUtils.createMockPluginDetails({
  id: 'Inspector',
  name: 'flipper-plugin-inspector',
  version: '0.59.0',
  dir: '/plugins/public/flipper-plugin-inspector',
  pluginType: 'client',
});

describe('info', () => {
  let mockStore: Store;

  beforeEach(() => {
    mockStore = createStore(createRootReducer());
    mockStore.dispatch({type: 'INIT'});
  });

  test('retrieve selection info', async () => {
    const networkPlugin = TestUtils.createTestPlugin(
      {
        plugin() {
          return {};
        },
      },
      networkPluginDetails,
    );
    const inspectorPlugin = TestUtils.createTestPlugin(
      {
        plugin() {
          return {};
        },
      },
      inspectorPluginDetails,
    );
    const {client, device, store} = await renderMockFlipperWithPlugin(
      networkPlugin,
      {
        additionalPlugins: [inspectorPlugin],
      },
    );
    initialize(store, getInstance());
    store.dispatch(
      registerLoadedPlugins([networkPluginDetails, inspectorPluginDetails]),
    );
    const networkPluginSelectionInfo = getInfo();
    store.dispatch(
      selectPlugin({
        selectedPlugin: inspectorPlugin.id,
        selectedApp: client.query.app,
        selectedDevice: device,
        deepLinkPayload: null,
      }),
    );
    const inspectorPluginSelectionInfo = getInfo();
    expect(networkPluginSelectionInfo.selection).toMatchInlineSnapshot(`
      Object {
        "app": "TestApp",
        "archived": false,
        "device": "MockAndroidDevice",
        "deviceName": "MockAndroidDevice",
        "deviceSerial": "serial",
        "deviceType": "physical",
        "os": "Android",
        "plugin": "Network",
        "pluginEnabled": true,
        "pluginName": "flipper-plugin-network",
        "pluginVersion": "0.78.0",
      }
    `);
    expect(inspectorPluginSelectionInfo.selection).toMatchInlineSnapshot(`
      Object {
        "app": "TestApp",
        "archived": false,
        "device": "MockAndroidDevice",
        "deviceName": "MockAndroidDevice",
        "deviceSerial": "serial",
        "deviceType": "physical",
        "os": "Android",
        "plugin": "Inspector",
        "pluginEnabled": true,
        "pluginName": "flipper-plugin-inspector",
        "pluginVersion": "0.59.0",
      }
    `);
  });
});
