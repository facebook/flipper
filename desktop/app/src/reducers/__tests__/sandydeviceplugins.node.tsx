/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {createMockFlipperWithPlugin} from '../../test-utils/createMockFlipperWithPlugin';
import {Store} from '../../';
import {selectPlugin} from '../../reducers/connections';
import {
  _SandyPluginDefinition,
  _SandyDevicePluginInstance,
  DevicePluginClient,
  TestUtils,
} from 'flipper-plugin';

const pluginDetails = TestUtils.createMockPluginDetails();

let initialized = false;

beforeEach(() => {
  initialized = false;
});

function devicePlugin(client: DevicePluginClient) {
  const activateStub = jest.fn();
  const deactivateStub = jest.fn();
  const destroyStub = jest.fn();

  client.onActivate(activateStub);
  client.onDeactivate(deactivateStub);
  client.onDestroy(destroyStub);

  initialized = true;

  return {
    activateStub: activateStub,
    deactivateStub: deactivateStub,
    destroyStub,
  };
}
const TestPlugin = new _SandyPluginDefinition(pluginDetails, {
  supportsDevice: jest.fn().mockImplementation(() => true),
  devicePlugin: jest
    .fn()
    .mockImplementation(devicePlugin) as typeof devicePlugin,
  Component: jest.fn().mockImplementation(() => null),
});

type PluginApi = ReturnType<typeof devicePlugin>;

function selectTestPlugin(store: Store) {
  store.dispatch(
    selectPlugin({
      selectedPlugin: TestPlugin.id,
      selectedApp: null,
      deepLinkPayload: null,
      selectedDevice: store.getState().connections.selectedDevice!,
    }),
  );
}

test('it should initialize device sandy plugins', async () => {
  const {device, store} = await createMockFlipperWithPlugin(TestPlugin);

  // already started, so initialized immediately
  expect(initialized).toBe(true);
  expect(device.sandyPluginStates.get(TestPlugin.id)).toBeInstanceOf(
    _SandyDevicePluginInstance,
  );
  expect(TestPlugin.asDevicePluginModule().supportsDevice).toBeCalledTimes(1);
  const instanceApi: PluginApi = device.sandyPluginStates.get(TestPlugin.id)!
    .instanceApi;

  expect(instanceApi.activateStub).toBeCalledTimes(0);
  selectTestPlugin(store);

  // without rendering, non-bg plugins won't connect automatically,
  // so this isn't the best test, but PluginContainer tests do test that part of the lifecycle
  device.sandyPluginStates.get(TestPlugin.id)!.activate();
  expect(instanceApi.activateStub).toBeCalledTimes(1);
  device.sandyPluginStates.get(TestPlugin.id)!.deactivate();
  expect(instanceApi.deactivateStub).toBeCalledTimes(1);
  expect(instanceApi.destroyStub).toBeCalledTimes(0);
});

test('it should cleanup if device is removed', async () => {
  const {device, store} = await createMockFlipperWithPlugin(TestPlugin);
  const pluginInstance = device.sandyPluginStates.get(TestPlugin.id)!;
  expect(pluginInstance.instanceApi.destroyStub).toHaveBeenCalledTimes(0);

  // close device
  store.dispatch({
    type: 'UNREGISTER_DEVICES',
    payload: new Set([device.serial]),
  });
  expect(
    (pluginInstance.instanceApi as PluginApi).destroyStub,
  ).toHaveBeenCalledTimes(1);
});
