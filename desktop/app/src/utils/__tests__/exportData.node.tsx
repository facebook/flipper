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
import {processStore, determinePluginsToProcess} from '../exportData';
import {FlipperPlugin, FlipperDevicePlugin} from '../../plugin';
import {Notification} from '../../plugin';
import {default as Client, ClientExport} from '../../Client';
import {State as PluginsState} from '../../reducers/plugins';

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
  expect(saltIdentifier).toEqual('app#iOS#archivedEmulator#salt-serial');
  expect(identifier).toEqual('app#iOS#archivedEmulator#serial');
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
    id: 'app#iOS#archivedEmulator#salt-serial',
    query: {
      app: 'app',
      os: 'iOS',
      device: 'archivedEmulator',
      device_id: 'salt-serial',
    },
  });
  expect(client).toEqual({
    id: 'app#iOS#archivedEmulator#serial',
    query: {
      app: 'app',
      os: 'iOS',
      device: 'archivedEmulator',
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
    id: 'app#iOS#archivedEmulator#serial',
    query: {
      app: 'app',
      os: 'iOS',
      device: 'archivedEmulator',
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
  expect(identifier).toEqual('app#iOS#archivedEmulator#serial');
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

test('test processStore function for empty state', () => {
  const json = processStore({
    activeNotifications: [],
    device: null,
    pluginStates: {},
    clients: [],
    devicePlugins: new Map(),
    clientPlugins: new Map(),
    salt: 'salt',
    selectedPlugins: [],
  });
  expect(json).rejects.toMatchInlineSnapshot(
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
  expect(deviceType).toEqual('archivedEmulator');
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
  const clientIdentifier = generateClientIdentifier(device, 'testapp');
  const json = await processStore({
    activeNotifications: [],
    device,
    pluginStates: {
      [`${clientIdentifier}#TestPlugin`]: {msg: 'Test plugin'},
    },
    clients: [generateClientFromDevice(device, 'testapp')],
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
  expect(pluginStates).toEqual(expectedPluginState);
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
    {app: 'app', os: 'iOS', device: 'TestiPhone', device_id: 'serial1'},
    null,
    logger,
    mockStore,
    ['TestPlugin', 'TestDevicePlugin'],
  );
  const client2 = new Client(
    generateClientIdentifier(device1, 'app2'),
    {app: 'app2', os: 'iOS', device: 'TestiPhone', device_id: 'serial1'},
    null,
    logger,
    mockStore,
    ['TestDevicePlugin'],
  );
  const client3 = new Client(
    generateClientIdentifier(device1, 'app3'),
    {app: 'app3', os: 'iOS', device: 'TestiPhone', device_id: 'serial1'},
    null,
    logger,
    mockStore,
    ['TestPlugin', 'TestDevicePlugin'],
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
    {app: 'app', os: 'iOS', device: 'TestiPhone', device_id: 'serial1'},
    null,
    logger,
    mockStore,
    ['TestPlugin', 'TestDevicePlugin'],
  );
  const client2 = new Client(
    generateClientIdentifier(device1, 'app2'),
    {app: 'app2', os: 'iOS', device: 'TestiPhone', device_id: 'serial1'},
    null,
    logger,
    mockStore,
    ['TestDevicePlugin'],
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
  };
  const op = determinePluginsToProcess([client1, client2], device1, plugins);
  expect(op).toBeDefined();
  expect(op).toEqual([]);
});

test('test determinePluginsToProcess for multiple clients on same device', async () => {
  const device1 = new BaseDevice('serial1', 'emulator', 'TestiPhone', 'iOS');
  const client1 = new Client(
    generateClientIdentifier(device1, 'app'),
    {app: 'app', os: 'iOS', device: 'TestiPhone', device_id: 'serial1'},
    null,
    logger,
    mockStore,
    ['TestPlugin', 'TestDevicePlugin'],
  );
  const client2 = new Client(
    generateClientIdentifier(device1, 'app2'),
    {app: 'app2', os: 'iOS', device: 'TestiPhone', device_id: 'serial1'},
    null,
    logger,
    mockStore,
    ['TestDevicePlugin'],
  );
  const plugins: PluginsState = {
    clientPlugins: new Map([['TestPlugin', TestPlugin]]),
    devicePlugins: new Map([['TestDevicePlugin', TestDevicePlugin]]),
    gatekeepedPlugins: [],
    disabledPlugins: [],
    failedPlugins: [],
    selectedPlugins: ['TestPlugin'],
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
    {app: 'app', os: 'iOS', device: 'TestiPhone', device_id: 'serial1'},
    null,
    logger,
    mockStore,
    ['TestPlugin', 'TestDevicePlugin'],
  );
  const client2Device1 = new Client(
    generateClientIdentifier(device1, 'app2'),
    {app: 'app1', os: 'iOS', device: 'TestiPhone', device_id: 'serial1'},
    null,
    logger,
    mockStore,
    ['TestDevicePlugin'],
  );
  const client1Device2 = new Client(
    generateClientIdentifier(device2, 'app'),
    {app: 'app', os: 'iOS', device: 'TestiPhone', device_id: 'serial2'},
    null,
    logger,
    mockStore,
    ['TestPlugin', 'TestDevicePlugin'],
  );
  const client2Device2 = new Client(
    generateClientIdentifier(device2, 'app2'),
    {app: 'app1', os: 'iOS', device: 'TestiPhone', device_id: 'serial2'},
    null,
    logger,
    mockStore,
    ['TestDevicePlugin'],
  );
  const plugins: PluginsState = {
    clientPlugins: new Map([['TestPlugin', TestPlugin]]),
    devicePlugins: new Map([['TestDevicePlugin', TestDevicePlugin]]),
    gatekeepedPlugins: [],
    disabledPlugins: [],
    failedPlugins: [],
    selectedPlugins: ['TestPlugin'],
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
    {app: 'app', os: 'iOS', device: 'TestiPhone', device_id: 'serial'},
    null,
    logger,
    mockStore,
    ['TestPlugin', 'TestDevicePlugin'],
  );
  const archivedClient = new Client(
    generateClientIdentifier(archivedDevice, 'app'),
    {app: 'app', os: 'iOS', device: 'TestiPhone', device_id: 'serial-archived'},
    null,
    logger,
    mockStore,
    ['TestPlugin', 'TestDevicePlugin'],
  );
  const plugins: PluginsState = {
    clientPlugins: new Map([['TestPlugin', TestPlugin]]),
    devicePlugins: new Map([['TestDevicePlugin', TestDevicePlugin]]),
    gatekeepedPlugins: [],
    disabledPlugins: [],
    failedPlugins: [],
    selectedPlugins: ['TestPlugin'],
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
