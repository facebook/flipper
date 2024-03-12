/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

jest.useFakeTimers();

import React from 'react';
import {renderMockFlipperWithPlugin} from '../../__tests__/test-utils/createMockFlipperWithPlugin';
import {
  _SandyPluginDefinition,
  PluginClient,
  TestUtils,
  usePlugin,
  createState,
  useValue,
  DevicePluginClient,
  Dialog,
} from 'flipper-plugin';
import {parseOpenPluginParams} from '../handleOpenPluginDeeplink';
import {handleDeeplink} from '../../deeplink';
import {selectPlugin} from '../../reducers/connections';

let origAlertImpl: any;
let origConfirmImpl: any;

beforeEach(() => {
  origAlertImpl = Dialog.alert;
  origConfirmImpl = Dialog.confirm;
});

afterEach(() => {
  Dialog.alert = origAlertImpl;
  Dialog.confirm = origConfirmImpl;
});

test('open-plugin deeplink parsing', () => {
  const testpayload = 'http://www.google/?test=c o%20o+l';
  const testLink = `flipper://open-plugin?plugin-id=graphql&client=facebook&devices=android,ios&chrome=1&payload=${encodeURIComponent(
    testpayload,
  )}`;
  const res = parseOpenPluginParams(testLink);
  expect(res).toEqual({
    pluginId: 'graphql',
    client: 'facebook',
    devices: ['android', 'ios'],
    payload: 'http://www.google/?test=c o o+l',
  });
});

test('open-plugin deeplink parsing - 2', () => {
  const testLink = 'flipper://open-plugin?plugin-id=graphql';
  const res = parseOpenPluginParams(testLink);
  expect(res).toEqual({
    pluginId: 'graphql',
    client: undefined,
    devices: [],
    payload: undefined,
  });
});

test('open-plugin deeplink parsing - 3', () => {
  expect(() =>
    parseOpenPluginParams('flipper://open-plugin?'),
  ).toThrowErrorMatchingInlineSnapshot(`"Missing plugin-id param"`);
});

test('Triggering a deeplink will work', async () => {
  const linksSeen: any[] = [];

  const plugin = (client: PluginClient) => {
    const linkState = createState('');
    client.onDeepLink((link) => {
      linksSeen.push(link);
      linkState.set(String(link));
    });
    return {
      linkState,
    };
  };

  const definition = new _SandyPluginDefinition(
    TestUtils.createMockPluginDetails(),
    {
      plugin,
      Component() {
        const instance = usePlugin(plugin);
        const linkState = useValue(instance.linkState);
        return <h1>{linkState || 'world'}</h1>;
      },
    },
  );
  const {renderer, client, store, logger} =
    await renderMockFlipperWithPlugin(definition);
  logger.track = jest.fn();

  expect(linksSeen).toEqual([]);

  await handleDeeplink(
    store,
    logger,
    `flipper://open-plugin?plugin-id=${definition.id}&client=${client.query.app}&payload=universe`,
  );

  jest.runAllTimers();
  expect(linksSeen).toEqual(['universe']);
  expect(renderer.baseElement).toMatchInlineSnapshot(`
    <body>
      <div>
        <div
          class="css-1x2cmzz-SandySplitContainer e148ues30"
        >
          <div />
          <div
            class="css-1knrt0j-SandySplitContainer e148ues30"
          >
            <div
              class="css-1woty6b-Container"
            >
              <h1>
                universe
              </h1>
            </div>
            <div
              class="css-724x97-View-FlexBox-FlexRow"
              id="detailsSidebar"
            />
          </div>
        </div>
      </div>
    </body>
  `);
  expect(logger.track).toHaveBeenCalledTimes(2);
  expect(logger.track).toHaveBeenCalledWith(
    'usage',
    'deeplink',
    {
      query:
        'flipper://open-plugin?plugin-id=TestPlugin&client=TestApp&payload=universe',
      state: 'INIT',
    },
    undefined,
  );
  expect(logger.track).toHaveBeenCalledWith(
    'usage',
    'deeplink',
    {
      query:
        'flipper://open-plugin?plugin-id=TestPlugin&client=TestApp&payload=universe',
      state: 'PLUGIN_OPEN_SUCCESS',
      plugin: {
        client: 'TestApp',
        devices: [],
        payload: 'universe',
        pluginId: 'TestPlugin',
      },
    },
    'TestPlugin',
  );
});

test('triggering a deeplink without applicable device can wait for a device', async () => {
  let lastOS: string = '';
  const definition = TestUtils.createTestDevicePlugin(
    {
      Component() {
        return <p>Hello</p>;
      },
      devicePlugin(c: DevicePluginClient) {
        lastOS = c.device.os;
        return {};
      },
    },
    {
      id: 'DevicePlugin',
      supportedDevices: [{os: 'iOS'}],
    },
  );
  const {renderer, store, logger, createDevice, device} =
    await renderMockFlipperWithPlugin(definition);

  store.dispatch(
    selectPlugin({
      selectedPlugin: 'nonexisting',
      deepLinkPayload: null,
      selectedDevice: device,
    }),
  );
  expect(renderer.baseElement).toMatchInlineSnapshot(`
    <body>
      <div>
        No plugin selected
      </div>
    </body>
  `);

  const handlePromise = handleDeeplink(
    store,
    logger,
    `flipper://open-plugin?plugin-id=${definition.id}&devices=iOS`,
  );

  jest.runAllTimers();

  // No device yet available (dialogs are not renderable atm)
  expect(renderer.baseElement).toMatchInlineSnapshot(`
    <body>
      <div>
        No plugin selected
      </div>
    </body>
  `);

  // create a new device
  createDevice({serial: 'device2', os: 'iOS'});

  // wizard should continue automatically
  await handlePromise;
  expect(renderer.baseElement).toMatchInlineSnapshot(`
    <body>
      <div>
        <div
          class="css-1x2cmzz-SandySplitContainer e148ues30"
        >
          <div />
          <div
            class="css-1knrt0j-SandySplitContainer e148ues30"
          >
            <div
              class="css-1woty6b-Container"
            >
              <p>
                Hello
              </p>
            </div>
            <div
              class="css-724x97-View-FlexBox-FlexRow"
              id="detailsSidebar"
            />
          </div>
        </div>
      </div>
    </body>
  `);

  expect(lastOS).toBe('iOS');
});

test('triggering a deeplink without applicable client can wait for a device', async () => {
  const definition = TestUtils.createTestPlugin(
    {
      Component() {
        return <p>Hello</p>;
      },
      plugin() {
        return {};
      },
    },
    {
      id: 'pluggy',
    },
  );
  const {renderer, store, createClient, device, logger} =
    await renderMockFlipperWithPlugin(definition);

  store.dispatch(
    selectPlugin({
      selectedPlugin: 'nonexisting',
      deepLinkPayload: null,
      selectedDevice: device,
    }),
  );
  expect(renderer.baseElement).toMatchInlineSnapshot(`
    <body>
      <div>
        No plugin selected
      </div>
    </body>
  `);

  const handlePromise = handleDeeplink(
    store,
    logger,
    `flipper://open-plugin?plugin-id=${definition.id}&client=clienty`,
  );

  jest.runAllTimers();

  // No device yet available (dialogs are not renderable atm)
  expect(renderer.baseElement).toMatchInlineSnapshot(`
    <body>
      <div>
        No plugin selected
      </div>
    </body>
  `);

  // create a new client
  createClient(device, 'clienty');

  // wizard should continue automatically
  await handlePromise;
  expect(renderer.baseElement).toMatchInlineSnapshot(`
    <body>
      <div>
        <div
          class="css-1x2cmzz-SandySplitContainer e148ues30"
        >
          <div />
          <div
            class="css-1knrt0j-SandySplitContainer e148ues30"
          >
            <div
              class="css-1woty6b-Container"
            >
              <p>
                Hello
              </p>
            </div>
            <div
              class="css-724x97-View-FlexBox-FlexRow"
              id="detailsSidebar"
            />
          </div>
        </div>
      </div>
    </body>
  `);
});

test('triggering a deeplink with incompatible device will cause bail', async () => {
  const definition = TestUtils.createTestDevicePlugin(
    {
      Component() {
        return <p>Hello</p>;
      },
      devicePlugin() {
        return {};
      },
    },
    {
      id: 'DevicePlugin',
      supportedDevices: [{os: 'iOS'}],
    },
  );
  const {store, logger, createDevice} =
    await renderMockFlipperWithPlugin(definition);
  logger.track = jest.fn();

  // Skipping user interactions.
  Dialog.alert = (async () => {}) as any;
  Dialog.confirm = (async () => {}) as any;

  store.dispatch(
    selectPlugin({selectedPlugin: 'nonexisting', deepLinkPayload: null}),
  );

  const handlePromise = handleDeeplink(
    store,
    logger,
    `flipper://open-plugin?plugin-id=${definition.id}&devices=iOS`,
  );

  jest.runAllTimers();

  // create a new device that doesn't match spec
  createDevice({serial: 'device2', os: 'Android'});

  // wait for dialogues
  await handlePromise;

  expect(logger.track).toHaveBeenCalledTimes(2);
  expect(logger.track).toHaveBeenCalledWith(
    'usage',
    'deeplink',
    {
      plugin: {
        client: undefined,
        devices: ['iOS'],
        payload: undefined,
        pluginId: 'DevicePlugin',
      },
      query: 'flipper://open-plugin?plugin-id=DevicePlugin&devices=iOS',
      state: 'PLUGIN_DEVICE_BAIL',
    },
    'DevicePlugin',
  );
});
