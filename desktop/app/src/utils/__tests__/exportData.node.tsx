/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {State} from '../../reducers/index';
import configureStore from 'redux-mock-store';
import {default as BaseDevice} from '../../devices/BaseDevice';
import {default as ArchivedDevice} from '../../devices/ArchivedDevice';
import {
  processStore,
  determinePluginsToProcess,
  exportStore,
  importDataToStore,
} from '../exportData';
import {FlipperPlugin, FlipperDevicePlugin} from '../../plugin';
import {Notification} from '../../plugin';
import {default as Client, ClientExport} from '../../Client';
import {State as PluginsState} from '../../reducers/plugins';
import {renderMockFlipperWithPlugin} from '../../test-utils/createMockFlipperWithPlugin';
import {
  TestUtils,
  _SandyPluginDefinition,
  createState,
  PluginClient,
} from 'flipper-plugin';
import {selectPlugin} from '../../reducers/connections';

class TestPlugin extends FlipperPlugin<any, any, any> {}
TestPlugin.title = 'TestPlugin';
TestPlugin.id = 'TestPlugin';
class TestDevicePlugin extends FlipperDevicePlugin<any, any, any> {}
TestDevicePlugin.title = 'TestDevicePlugin';
TestDevicePlugin.id = 'TestDevicePlugin';
const logger = {
  track: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  trackTimeSince: () => {},
};
const mockStore = configureStore<State, {}>([])();

function generateNotifications(
  id: string,
  title: string,
  message: string,
  severity: 'warning' | 'error',
): Notification {
  return {id, title, message, severity};
}

function generateClientIdentifier(device: BaseDevice, app: string): string {
  const {os, deviceType, serial} = device;
  const identifier = `${app}#${os}#${deviceType}#${serial}`;
  return identifier;
}

function generateClientIdentifierWithSalt(
  identifier: string,
  salt: string,
): string {
  const array = identifier.split('#');
  const serial = array.pop();
  return array.join('#') + '#' + salt + '-' + serial;
}

function generateClientFromClientWithSalt(
  client: ClientExport,
  salt: string,
): ClientExport {
  const {os, device, device_id, app} = client.query;
  const identifier = generateClientIdentifierWithSalt(client.id, salt);
  return {
    id: identifier,
    query: {app, os, device, device_id: salt + '-' + device_id},
  };
}
function generateClientFromDevice(
  device: BaseDevice,
  app: string,
): ClientExport {
  const {os, deviceType, serial} = device;
  const identifier = generateClientIdentifier(device, app);
  return {
    id: identifier,
    query: {app, os, device: deviceType, device_id: serial},
  };
}

test('test generateClientIndentifierWithSalt helper function', () => {
  const device = new ArchivedDevice({
    serial: 'serial',
    deviceType: 'emulator',
    title: 'TestiPhone',
    os: 'iOS',
    logEntries: [],
    screenshotHandle: null,
  });
  const identifier = generateClientIdentifier(device, 'app');
  const saltIdentifier = generateClientIdentifierWithSalt(identifier, 'salt');
  expect(saltIdentifier).toEqual('app#iOS#emulator#salt-serial');
  expect(identifier).toEqual('app#iOS#emulator#serial');
});

test('test generateClientFromClientWithSalt helper function', () => {
  const device = new ArchivedDevice({
    serial: 'serial',
    deviceType: 'emulator',
    title: 'TestiPhone',
    os: 'iOS',
    logEntries: [],
    screenshotHandle: null,
  });
  const client = generateClientFromDevice(device, 'app');
  const saltedClient = generateClientFromClientWithSalt(client, 'salt');
  expect(saltedClient).toEqual({
    id: 'app#iOS#emulator#salt-serial',
    query: {
      app: 'app',
      os: 'iOS',
      device: 'emulator',
      device_id: 'salt-serial',
    },
  });
  expect(client).toEqual({
    id: 'app#iOS#emulator#serial',
    query: {
      app: 'app',
      os: 'iOS',
      device: 'emulator',
      device_id: 'serial',
    },
  });
});

test('test generateClientFromDevice helper function', () => {
  const device = new ArchivedDevice({
    serial: 'serial',
    deviceType: 'emulator',
    title: 'TestiPhone',
    os: 'iOS',
    logEntries: [],
    screenshotHandle: null,
  });
  const client = generateClientFromDevice(device, 'app');
  expect(client).toEqual({
    id: 'app#iOS#emulator#serial',
    query: {
      app: 'app',
      os: 'iOS',
      device: 'emulator',
      device_id: 'serial',
    },
  });
});

test('test generateClientIdentifier helper function', () => {
  const device = new ArchivedDevice({
    serial: 'serial',
    deviceType: 'emulator',
    title: 'TestiPhone',
    os: 'iOS',
    logEntries: [],
    screenshotHandle: null,
  });
  const identifier = generateClientIdentifier(device, 'app');
  expect(identifier).toEqual('app#iOS#emulator#serial');
});

test('test generateNotifications helper function', () => {
  const notification = generateNotifications('id', 'title', 'msg', 'error');
  expect(notification).toEqual({
    id: 'id',
    title: 'title',
    message: 'msg',
    severity: 'error',
  });
});

test('test processStore function for empty state', async () => {
  expect(
    processStore({
      activeNotifications: [],
      device: null,
      pluginStates: {},
      clients: [],
      devicePlugins: new Map(),
      clientPlugins: new Map(),
      salt: 'salt',
      selectedPlugins: [],
      pluginStates2: {},
    }),
  ).rejects.toMatchInlineSnapshot(
    `[Error: Selected device is null, please select a device]`,
  );
});

test('test processStore function for an iOS device connected', async () => {
  const json = await processStore({
    activeNotifications: [],
    device: new ArchivedDevice({
      serial: 'serial',
      deviceType: 'emulator',
      title: 'TestiPhone',
      os: 'iOS',
      logEntries: [],
      screenshotHandle: null,
    }),
    pluginStates: {},
    pluginStates2: {},
    clients: [],
    devicePlugins: new Map(),
    clientPlugins: new Map(),
    salt: 'salt',
    selectedPlugins: [],
  });
  if (!json) {
    fail('json is undefined');
  }
  const {device, clients} = json;
  expect(json.device).toBeDefined();
  expect(clients).toEqual([]);
  if (!device) {
    fail('device is undefined');
  }
  const {serial, deviceType, title, os} = device;
  expect(serial).toEqual('salt-serial');
  expect(deviceType).toEqual('emulator');
  expect(title).toEqual('TestiPhone');
  expect(os).toEqual('iOS');
  const {pluginStates, activeNotifications} = json.store;
  expect(pluginStates).toEqual({});
  expect(activeNotifications).toEqual([]);
});

test('test processStore function for an iOS device connected with client plugin data', async () => {
  const device = new ArchivedDevice({
    serial: 'serial',
    deviceType: 'emulator',
    title: 'TestiPhone',
    os: 'iOS',
    logEntries: [],
    screenshotHandle: null,
  });
  const client = generateClientFromDevice(device, 'testapp');
  const clientIdentifier = generateClientIdentifier(device, 'testapp');
  const json = await processStore({
    activeNotifications: [],
    device,
    pluginStates: {
      [`${clientIdentifier}#TestPlugin`]: {msg: 'Test plugin'},
    },
    pluginStates2: {
      [`${clientIdentifier}`]: {TestPlugin2: [{msg: 'Test plugin2'}]},
    },
    clients: [client],
    devicePlugins: new Map(),
    clientPlugins: new Map([['TestPlugin', TestPlugin]]),
    salt: 'salt',
    selectedPlugins: [],
  });
  if (!json) {
    fail('json is undefined');
  }
  const {pluginStates} = json.store;
  const expectedPluginState = {
    [`${generateClientIdentifierWithSalt(
      clientIdentifier,
      'salt',
    )}#TestPlugin`]: JSON.stringify({
      msg: 'Test plugin',
    }),
  };
  const expectedPluginState2 = {
    [`${generateClientIdentifierWithSalt(clientIdentifier, 'salt')}`]: {
      TestPlugin2: [
        {
          msg: 'Test plugin2',
        },
      ],
    },
  };
  expect(pluginStates).toEqual(expectedPluginState);
  expect(json.pluginStates2).toEqual(expectedPluginState2);
});

test('test processStore function to have only the client for the selected device', async () => {
  const selectedDevice = new ArchivedDevice({
    serial: 'serial',
    deviceType: 'emulator',
    title: 'TestiPhone',
    os: 'iOS',
    logEntries: [],
    screenshotHandle: null,
  });
  const unselectedDevice = new ArchivedDevice({
    serial: 'identifier',
    deviceType: 'emulator',
    title: 'TestiPhone',
    os: 'iOS',
    logEntries: [],
    screenshotHandle: null,
  });

  const unselectedDeviceClientIdentifier = generateClientIdentifier(
    unselectedDevice,
    'testapp',
  );
  const selectedDeviceClientIdentifier = generateClientIdentifier(
    selectedDevice,
    'testapp',
  );
  const selectedDeviceClient = generateClientFromDevice(
    selectedDevice,
    'testapp',
  );
  const json = await processStore({
    activeNotifications: [],
    device: selectedDevice,
    pluginStates: {
      [unselectedDeviceClientIdentifier + '#TestDevicePlugin']: {
        msg: 'Test plugin unselected device',
      },
      [selectedDeviceClientIdentifier + '#TestDevicePlugin']: {
        msg: 'Test plugin selected device',
      },
    },
    pluginStates2: {},
    clients: [
      selectedDeviceClient,
      generateClientFromDevice(unselectedDevice, 'testapp'),
    ],
    devicePlugins: new Map(),
    clientPlugins: new Map([['TestDevicePlugin', TestPlugin]]),
    salt: 'salt',
    selectedPlugins: [],
  });

  if (!json) {
    fail('json is undefined');
  }
  const {clients} = json;
  const {pluginStates} = json.store;
  const expectedPluginState = {
    [generateClientIdentifierWithSalt(selectedDeviceClientIdentifier, 'salt') +
    '#TestDevicePlugin']: JSON.stringify({
      msg: 'Test plugin selected device',
    }),
  };
  expect(clients).toEqual([
    generateClientFromClientWithSalt(selectedDeviceClient, 'salt'),
  ]);
  expect(pluginStates).toEqual(expectedPluginState);
});

test('test processStore function to have multiple clients for the selected device', async () => {
  const selectedDevice = new ArchivedDevice({
    serial: 'serial',
    deviceType: 'emulator',
    title: 'TestiPhone',
    os: 'iOS',
    logEntries: [],
    screenshotHandle: null,
  });

  const clientIdentifierApp1 = generateClientIdentifier(
    selectedDevice,
    'testapp1',
  );
  const clientIdentifierApp2 = generateClientIdentifier(
    selectedDevice,
    'testapp2',
  );

  const client1 = generateClientFromDevice(selectedDevice, 'testapp1');
  const client2 = generateClientFromDevice(selectedDevice, 'testapp2');

  const json = await processStore({
    activeNotifications: [],
    device: selectedDevice,
    pluginStates: {
      [clientIdentifierApp1 + '#TestPlugin']: {
        msg: 'Test plugin App1',
      },
      [clientIdentifierApp2 + '#TestPlugin']: {
        msg: 'Test plugin App2',
      },
    },
    pluginStates2: {},
    clients: [
      generateClientFromDevice(selectedDevice, 'testapp1'),
      generateClientFromDevice(selectedDevice, 'testapp2'),
    ],
    devicePlugins: new Map(),
    clientPlugins: new Map([['TestPlugin', TestPlugin]]),
    salt: 'salt',
    selectedPlugins: [],
  });

  if (!json) {
    fail('json is undefined');
  }
  const {clients} = json;
  const {pluginStates} = json.store;
  const expectedPluginState = {
    [generateClientIdentifierWithSalt(clientIdentifierApp1, 'salt') +
    '#TestPlugin']: JSON.stringify({
      msg: 'Test plugin App1',
    }),
    [generateClientIdentifierWithSalt(clientIdentifierApp2, 'salt') +
    '#TestPlugin']: JSON.stringify({
      msg: 'Test plugin App2',
    }),
  };
  expect(clients).toEqual([
    generateClientFromClientWithSalt(client1, 'salt'),
    generateClientFromClientWithSalt(client2, 'salt'),
  ]);
  expect(pluginStates).toEqual(expectedPluginState);
});

test('test processStore function for device plugin state and no clients', async () => {
  // Test case to verify that device plugin data is exported even if there are no clients
  const selectedDevice = new ArchivedDevice({
    serial: 'serial',
    deviceType: 'emulator',
    title: 'TestiPhone',
    os: 'iOS',
    logEntries: [],
    screenshotHandle: null,
  });
  const json = await processStore({
    activeNotifications: [],
    device: selectedDevice,
    pluginStates: {
      'serial#TestDevicePlugin': {
        msg: 'Test Device plugin',
      },
    },
    pluginStates2: {},
    clients: [],
    devicePlugins: new Map([['TestDevicePlugin', TestDevicePlugin]]),
    clientPlugins: new Map(),
    salt: 'salt',
    selectedPlugins: [],
  });

  if (!json) {
    fail('json is undefined');
  }
  const {pluginStates} = json.store;
  const {clients} = json;
  const expectedPluginState = {
    'salt-serial#TestDevicePlugin': JSON.stringify({msg: 'Test Device plugin'}),
  };
  expect(pluginStates).toEqual(expectedPluginState);
  expect(clients).toEqual([]);
});

test('test processStore function for unselected device plugin state and no clients', async () => {
  // Test case to verify that device plugin data is exported even if there are no clients
  const selectedDevice = new ArchivedDevice({
    serial: 'serial',
    deviceType: 'emulator',
    title: 'TestiPhone',
    os: 'iOS',
    logEntries: [],
    screenshotHandle: null,
  });
  const json = await processStore({
    activeNotifications: [],
    device: selectedDevice,
    pluginStates: {
      'unselectedDeviceIdentifier#TestDevicePlugin': {
        msg: 'Test Device plugin',
      },
    },
    pluginStates2: {},
    clients: [],
    devicePlugins: new Map([['TestDevicePlugin', TestDevicePlugin]]),
    clientPlugins: new Map(),
    salt: 'salt',
    selectedPlugins: [],
  });
  if (!json) {
    fail('json is undefined');
  }
  const {pluginStates} = json.store;
  const {clients} = json;
  expect(pluginStates).toEqual({});
  expect(clients).toEqual([]);
});

test('test processStore function for notifications for selected device', async () => {
  // Test case to verify that device plugin data is exported even if there are no clients
  const selectedDevice = new ArchivedDevice({
    serial: 'serial',
    deviceType: 'emulator',
    title: 'TestiPhone',
    os: 'iOS',
    logEntries: [],
    screenshotHandle: null,
  });
  const client = generateClientFromDevice(selectedDevice, 'testapp1');
  const notification = generateNotifications(
    'notificationID',
    'title',
    'Notification Message',
    'warning',
  );
  const activeNotification = {
    pluginId: 'TestNotification',
    notification,
    client: client.id,
  };
  const json = await processStore({
    activeNotifications: [activeNotification],
    device: selectedDevice,
    pluginStates: {},
    pluginStates2: {},
    clients: [client],
    devicePlugins: new Map([['TestDevicePlugin', TestDevicePlugin]]),
    clientPlugins: new Map(),
    salt: 'salt',
    selectedPlugins: [],
  });

  if (!json) {
    fail('json is undefined');
  }
  const {pluginStates} = json.store;
  const {clients} = json;
  expect(pluginStates).toEqual({});
  expect(clients).toEqual([generateClientFromClientWithSalt(client, 'salt')]);
  const {activeNotifications} = json.store;
  const expectedActiveNotification = {
    pluginId: 'TestNotification',
    notification,
    client: generateClientIdentifierWithSalt(client.id, 'salt'),
  };
  expect(activeNotifications).toEqual([expectedActiveNotification]);
});

test('test processStore function for notifications for unselected device', async () => {
  // Test case to verify that device plugin data is exported even if there are no clients
  const selectedDevice = new ArchivedDevice({
    serial: 'serial',
    deviceType: 'emulator',
    title: 'TestiPhone',
    os: 'iOS',
    logEntries: [],
    screenshotHandle: null,
  });
  const unselectedDevice = new ArchivedDevice({
    serial: 'identifier',
    deviceType: 'emulator',
    title: 'TestiPhone',
    os: 'iOS',
    logEntries: [],
    screenshotHandle: null,
  });

  const client = generateClientFromDevice(selectedDevice, 'testapp1');
  const unselectedclient = generateClientFromDevice(
    unselectedDevice,
    'testapp1',
  );
  const notification = generateNotifications(
    'notificationID',
    'title',
    'Notification Message',
    'warning',
  );
  const activeNotification = {
    pluginId: 'TestNotification',
    notification,
    client: unselectedclient.id,
  };
  const json = await processStore({
    activeNotifications: [activeNotification],
    device: selectedDevice,
    pluginStates: {},
    pluginStates2: {},
    clients: [client, unselectedclient],
    devicePlugins: new Map(),
    clientPlugins: new Map(),
    salt: 'salt',
    selectedPlugins: [],
  });
  if (!json) {
    fail('json is undefined');
  }
  const {pluginStates} = json.store;
  const {clients} = json;
  expect(pluginStates).toEqual({});
  expect(clients).toEqual([generateClientFromClientWithSalt(client, 'salt')]);
  const {activeNotifications} = json.store;
  expect(activeNotifications).toEqual([]);
});

test('test processStore function for selected plugins', async () => {
  const selectedDevice = new ArchivedDevice({
    serial: 'serial',
    deviceType: 'emulator',
    title: 'TestiPhone',
    os: 'iOS',
    logEntries: [],
    screenshotHandle: null,
  });

  const client = generateClientFromDevice(selectedDevice, 'app');
  const pluginstates = {
    [generateClientIdentifier(selectedDevice, 'app') + '#TestDevicePlugin1']: {
      msg: 'Test plugin1',
    },
    [generateClientIdentifier(selectedDevice, 'app') + '#TestDevicePlugin2']: {
      msg: 'Test plugin2',
    },
  };
  const json = await processStore({
    activeNotifications: [],
    device: selectedDevice,
    pluginStates: pluginstates,
    pluginStates2: {},
    clients: [client],
    devicePlugins: new Map([
      ['TestDevicePlugin1', TestDevicePlugin],
      ['TestDevicePlugin2', TestDevicePlugin],
    ]),
    clientPlugins: new Map(),
    salt: 'salt',
    selectedPlugins: ['TestDevicePlugin2'],
  });
  if (!json) {
    fail('json is undefined');
  }
  const {pluginStates} = json.store;
  const {clients} = json;
  expect(pluginStates).toEqual({
    [generateClientIdentifierWithSalt(
      generateClientIdentifier(selectedDevice, 'app'),
      'salt',
    ) + '#TestDevicePlugin2']: JSON.stringify({
      msg: 'Test plugin2',
    }),
  });
  expect(clients).toEqual([generateClientFromClientWithSalt(client, 'salt')]);
  const {activeNotifications} = json.store;
  expect(activeNotifications).toEqual([]);
});

test('test processStore function for no selected plugins', async () => {
  const selectedDevice = new ArchivedDevice({
    serial: 'serial',
    deviceType: 'emulator',
    title: 'TestiPhone',
    os: 'iOS',
    logEntries: [],
    screenshotHandle: null,
  });
  const client = generateClientFromDevice(selectedDevice, 'app');
  const pluginstates = {
    [generateClientIdentifier(selectedDevice, 'app') + '#TestDevicePlugin1']: {
      msg: 'Test plugin1',
    },
    [generateClientIdentifier(selectedDevice, 'app') + '#TestDevicePlugin2']: {
      msg: 'Test plugin2',
    },
  };
  const json = await processStore({
    activeNotifications: [],
    device: selectedDevice,
    pluginStates: pluginstates,
    pluginStates2: {},
    clients: [client],
    devicePlugins: new Map([
      ['TestDevicePlugin1', TestDevicePlugin],
      ['TestDevicePlugin2', TestDevicePlugin],
    ]),
    clientPlugins: new Map(),
    salt: 'salt',
    selectedPlugins: [],
  });

  if (!json) {
    fail('json is undefined');
  }
  const {pluginStates} = json.store;
  const {clients} = json;
  expect(pluginStates).toEqual({
    [generateClientIdentifierWithSalt(
      generateClientIdentifier(selectedDevice, 'app'),
      'salt',
    ) + '#TestDevicePlugin2']: JSON.stringify({
      msg: 'Test plugin2',
    }),
    [generateClientIdentifierWithSalt(
      generateClientIdentifier(selectedDevice, 'app'),
      'salt',
    ) + '#TestDevicePlugin1']: JSON.stringify({
      msg: 'Test plugin1',
    }),
  });
  expect(clients).toEqual([generateClientFromClientWithSalt(client, 'salt')]);
  const {activeNotifications} = json.store;
  expect(activeNotifications).toEqual([]);
});

test('test determinePluginsToProcess for mutilple clients having plugins present', async () => {
  const device1 = new BaseDevice('serial1', 'emulator', 'TestiPhone', 'iOS');
  const client1 = new Client(
    generateClientIdentifier(device1, 'app'),
    {
      app: 'app',
      os: 'iOS',
      device: 'TestiPhone',
      device_id: 'serial1',
    },
    null,
    logger,
    mockStore,
    ['TestPlugin', 'TestDevicePlugin'],
    device1,
  );
  const client2 = new Client(
    generateClientIdentifier(device1, 'app2'),
    {
      app: 'app2',
      os: 'iOS',
      device: 'TestiPhone',
      device_id: 'serial1',
    },
    null,
    logger,
    mockStore,
    ['TestDevicePlugin'],
    device1,
  );
  const client3 = new Client(
    generateClientIdentifier(device1, 'app3'),
    {
      app: 'app3',
      os: 'iOS',
      device: 'TestiPhone',
      device_id: 'serial1',
    },
    null,
    logger,
    mockStore,
    ['TestPlugin', 'TestDevicePlugin'],
    device1,
  );
  const plugins: PluginsState = {
    clientPlugins: new Map([
      ['TestPlugin', TestPlugin],
      ['RandomPlugin', TestPlugin],
    ]),
    devicePlugins: new Map([['TestDevicePlugin', TestDevicePlugin]]),
    gatekeepedPlugins: [],
    disabledPlugins: [],
    failedPlugins: [],
    selectedPlugins: ['TestPlugin'],
    marketplacePlugins: [],
  };
  const op = determinePluginsToProcess(
    [client1, client2, client3],
    device1,
    plugins,
  );
  expect(op).toBeDefined();
  expect(op).toEqual([
    {
      pluginKey: `${client1.id}#TestPlugin`,
      pluginId: 'TestPlugin',
      pluginName: 'TestPlugin',
      pluginClass: TestPlugin,
      client: client1,
    },
    {
      pluginKey: `${client3.id}#TestPlugin`,
      pluginId: 'TestPlugin',
      pluginName: 'TestPlugin',
      pluginClass: TestPlugin,
      client: client3,
    },
  ]);
});

test('test determinePluginsToProcess for no selected plugin present in any clients', async () => {
  const device1 = new BaseDevice('serial1', 'emulator', 'TestiPhone', 'iOS');
  const client1 = new Client(
    generateClientIdentifier(device1, 'app'),
    {
      app: 'app',
      os: 'iOS',
      device: 'TestiPhone',
      device_id: 'serial1',
    },
    null,
    logger,
    mockStore,
    ['TestPlugin', 'TestDevicePlugin'],
    device1,
  );
  const client2 = new Client(
    generateClientIdentifier(device1, 'app2'),
    {
      app: 'app2',
      os: 'iOS',
      device: 'TestiPhone',
      device_id: 'serial1',
    },
    null,
    logger,
    mockStore,
    ['TestDevicePlugin'],
    device1,
  );
  const plugins: PluginsState = {
    clientPlugins: new Map([
      ['TestPlugin', TestPlugin],
      ['RandomPlugin', TestPlugin],
    ]),
    devicePlugins: new Map([['TestDevicePlugin', TestDevicePlugin]]),
    gatekeepedPlugins: [],
    disabledPlugins: [],
    failedPlugins: [],
    selectedPlugins: ['RandomPlugin'],
    marketplacePlugins: [],
  };
  const op = determinePluginsToProcess([client1, client2], device1, plugins);
  expect(op).toBeDefined();
  expect(op).toEqual([]);
});

test('test determinePluginsToProcess for multiple clients on same device', async () => {
  const device1 = new BaseDevice('serial1', 'emulator', 'TestiPhone', 'iOS');
  const client1 = new Client(
    generateClientIdentifier(device1, 'app'),
    {
      app: 'app',
      os: 'iOS',
      device: 'TestiPhone',
      device_id: 'serial1',
    },
    null,
    logger,
    mockStore,
    ['TestPlugin', 'TestDevicePlugin'],
    device1,
  );
  const client2 = new Client(
    generateClientIdentifier(device1, 'app2'),
    {
      app: 'app2',
      os: 'iOS',
      device: 'TestiPhone',
      device_id: 'serial1',
    },
    null,
    logger,
    mockStore,
    ['TestDevicePlugin'],
    device1,
  );
  const plugins: PluginsState = {
    clientPlugins: new Map([['TestPlugin', TestPlugin]]),
    devicePlugins: new Map([['TestDevicePlugin', TestDevicePlugin]]),
    gatekeepedPlugins: [],
    disabledPlugins: [],
    failedPlugins: [],
    selectedPlugins: ['TestPlugin'],
    marketplacePlugins: [],
  };
  const op = determinePluginsToProcess([client1, client2], device1, plugins);
  expect(op).toBeDefined();
  expect(op.length).toEqual(1);
  expect(op).toEqual([
    {
      pluginKey: `${client1.id}#TestPlugin`,
      pluginId: 'TestPlugin',
      pluginName: 'TestPlugin',
      pluginClass: TestPlugin,
      client: client1,
    },
  ]);
});

test('test determinePluginsToProcess for multiple clients on different device', async () => {
  const device1 = new BaseDevice('serial1', 'emulator', 'TestiPhone', 'iOS');
  const device2 = new BaseDevice('serial2', 'emulator', 'TestiPhone', 'iOS');
  const client1Device1 = new Client(
    generateClientIdentifier(device1, 'app'),
    {
      app: 'app',
      os: 'iOS',
      device: 'TestiPhone',
      device_id: 'serial1',
    },
    null,
    logger,
    mockStore,
    ['TestPlugin', 'TestDevicePlugin'],
    device1,
  );
  const client2Device1 = new Client(
    generateClientIdentifier(device1, 'app2'),
    {
      app: 'app1',
      os: 'iOS',
      device: 'TestiPhone',
      device_id: 'serial1',
    },
    null,
    logger,
    mockStore,
    ['TestDevicePlugin'],
    device1,
  );
  const client1Device2 = new Client(
    generateClientIdentifier(device2, 'app'),
    {
      app: 'app',
      os: 'iOS',
      device: 'TestiPhone',
      device_id: 'serial2',
    },
    null,
    logger,
    mockStore,
    ['TestPlugin', 'TestDevicePlugin'],
    device1,
  );
  const client2Device2 = new Client(
    generateClientIdentifier(device2, 'app2'),
    {
      app: 'app1',
      os: 'iOS',
      device: 'TestiPhone',
      device_id: 'serial2',
    },
    null,
    logger,
    mockStore,
    ['TestDevicePlugin'],
    device1,
  );
  const plugins: PluginsState = {
    clientPlugins: new Map([['TestPlugin', TestPlugin]]),
    devicePlugins: new Map([['TestDevicePlugin', TestDevicePlugin]]),
    gatekeepedPlugins: [],
    disabledPlugins: [],
    failedPlugins: [],
    selectedPlugins: ['TestPlugin'],
    marketplacePlugins: [],
  };
  const op = determinePluginsToProcess(
    [client1Device1, client2Device1, client1Device2, client2Device2],
    device2,
    plugins,
  );
  expect(op).toBeDefined();
  expect(op.length).toEqual(1);
  expect(op).toEqual([
    {
      pluginKey: `${client1Device2.id}#TestPlugin`,
      pluginId: 'TestPlugin',
      pluginName: 'TestPlugin',
      pluginClass: TestPlugin,
      client: client1Device2,
    },
  ]);
});

test('test determinePluginsToProcess to ignore archived clients', async () => {
  const selectedDevice = new BaseDevice(
    'serial',
    'emulator',
    'TestiPhone',
    'iOS',
  );
  const archivedDevice = new ArchivedDevice({
    serial: 'serial-archived',
    deviceType: 'emulator',
    title: 'TestiPhone',
    os: 'iOS',
    logEntries: [],
    screenshotHandle: null,
  });
  const logger = {
    track: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
    trackTimeSince: () => {},
  };
  const mockStore = configureStore<State, {}>([])();
  const client = new Client(
    generateClientIdentifier(selectedDevice, 'app'),
    {
      app: 'app',
      os: 'iOS',
      device: 'TestiPhone',
      device_id: 'serial',
    },
    null,
    logger,
    mockStore,
    ['TestPlugin', 'TestDevicePlugin'],
    archivedDevice,
  );
  const archivedClient = new Client(
    generateClientIdentifier(archivedDevice, 'app'),
    {
      app: 'app',
      os: 'iOS',
      device: 'TestiPhone',
      device_id: 'serial-archived',
    },
    null,
    logger,
    mockStore,
    ['TestPlugin', 'TestDevicePlugin'],
    archivedDevice,
  );
  const plugins: PluginsState = {
    clientPlugins: new Map([['TestPlugin', TestPlugin]]),
    devicePlugins: new Map([['TestDevicePlugin', TestDevicePlugin]]),
    gatekeepedPlugins: [],
    disabledPlugins: [],
    failedPlugins: [],
    selectedPlugins: ['TestPlugin'],
    marketplacePlugins: [],
  };
  const op = determinePluginsToProcess(
    [client, archivedClient],
    selectedDevice,
    plugins,
  );
  expect(op).toBeDefined();
  expect(op.length).toEqual(1);
  expect(op).toEqual([
    {
      pluginKey: `${client.id}#TestPlugin`,
      pluginId: 'TestPlugin',
      pluginName: 'TestPlugin',
      pluginClass: TestPlugin,
      client: client,
    },
  ]);
});

const sandyTestPlugin = new _SandyPluginDefinition(
  TestUtils.createMockPluginDetails(),
  {
    plugin(
      client: PluginClient<{
        inc: {};
      }>,
    ) {
      const counter = createState(0, {persist: 'counter'});
      const _somethingElse = createState(0);
      const anotherState = createState({testCount: 0}, {persist: 'otherState'});

      client.onMessage('inc', () => {
        counter.set(counter.get() + 1);
        anotherState.update((draft) => {
          draft.testCount -= 1;
        });
      });
      return {};
    },
    Component() {
      return null;
    },
  },
);

test('Sandy plugins are exported properly', async () => {
  const {client, sendMessage, store} = await renderMockFlipperWithPlugin(
    sandyTestPlugin,
  );

  // We do select another plugin, to verify that pending message queues are indeed processed before exporting
  store.dispatch(
    selectPlugin({
      selectedPlugin: 'DeviceLogs',
      selectedApp: client.id,
      deepLinkPayload: null,
    }),
  );

  // Deliberately not using 'act' here, to verify that exportStore itself makes sure buffers are flushed first
  sendMessage('inc', {});
  sendMessage('inc', {});
  sendMessage('inc', {});

  const storeExport = await exportStore(store);
  const serial = storeExport.exportStoreData.device!.serial;
  expect(serial).not.toBeFalsy();
  expect(storeExport.exportStoreData.pluginStates2).toEqual({
    [`TestApp#Android#MockAndroidDevice#${serial}`]: {
      TestPlugin: {counter: 3, otherState: {testCount: -3}},
    },
  });
});

test('Sandy plugins are imported properly', async () => {
  const data = {
    clients: [
      {
        id:
          'TestApp#Android#MockAndroidDevice#2e52cea6-94b0-4ea1-b9a8-c9135ede14ca-serial',
        query: {
          app: 'TestApp',
          device: 'MockAndroidDevice',
          device_id: '2e52cea6-94b0-4ea1-b9a8-c9135ede14ca-serial',
          os: 'Android',
          sdk_version: 4,
        },
      },
    ],
    device: {
      deviceType: 'physical',
      logs: [],
      os: 'Android',
      serial: '2e52cea6-94b0-4ea1-b9a8-c9135ede14ca-serial',
      title: 'MockAndroidDevice',
    },
    deviceScreenshot: null,
    fileVersion: '0.9.99',
    flipperReleaseRevision: undefined,
    pluginStates2: {
      'TestApp#Android#MockAndroidDevice#2e52cea6-94b0-4ea1-b9a8-c9135ede14ca-serial': {
        TestPlugin: {
          otherState: {
            testCount: -3,
          },
          counter: 3,
        },
      },
    },
    store: {
      activeNotifications: [],
      pluginStates: {},
    },
  };

  const {client, store} = await renderMockFlipperWithPlugin(sandyTestPlugin);

  await importDataToStore('unittest.json', JSON.stringify(data), store);

  const client2 = store.getState().connections.clients[1];
  expect(client2).not.toBeFalsy();
  expect(client2).not.toBe(client);
  expect(client2.plugins).toEqual([TestPlugin.id]);

  expect(client.sandyPluginStates.get(TestPlugin.id)!.exportState())
    .toMatchInlineSnapshot(`
    Object {
      "counter": 0,
      "otherState": Object {
        "testCount": 0,
      },
    }
  `);
  expect(client2.sandyPluginStates.get(TestPlugin.id)!.exportState())
    .toMatchInlineSnapshot(`
    Object {
      "counter": 3,
      "otherState": Object {
        "testCount": -3,
      },
    }
  `);
});
