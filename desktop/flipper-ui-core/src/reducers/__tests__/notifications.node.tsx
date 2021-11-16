/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {createMockFlipperWithPlugin} from '../../test-utils/createMockFlipperWithPlugin';
import {
  _SandyPluginDefinition,
  TestUtils,
  PluginClient,
  Notification,
  DevicePluginClient,
} from 'flipper-plugin';
import {State, addNotification, removeNotification} from '../notifications';

import {
  default as reducer,
  setActiveNotifications,
  clearAllNotifications,
  updatePluginBlocklist,
  updateCategoryBlocklist,
} from '../notifications';

const notification: Notification = {
  id: 'id',
  title: 'title',
  message: 'message',
  severity: 'warning',
};

function getInitialState(): State {
  return {
    activeNotifications: [],
    invalidatedNotifications: [],
    blocklistedPlugins: [],
    blocklistedCategories: [],
    clearedNotifications: new Set(),
  };
}

test('reduce updateCategoryBlocklist', () => {
  const blocklistedCategories = ['blocklistedCategory'];
  const res = reducer(
    getInitialState(),
    updateCategoryBlocklist(blocklistedCategories),
  );
  expect(res).toEqual({
    ...getInitialState(),
    blocklistedCategories,
  });
});

test('reduce updatePluginBlocklist', () => {
  const blocklistedPlugins = ['blocklistedPlugin'];
  const res = reducer(
    getInitialState(),
    updatePluginBlocklist(blocklistedPlugins),
  );
  expect(res).toEqual({
    ...getInitialState(),
    blocklistedPlugins,
  });
});

test('reduce clearAllNotifications', () => {
  const pluginId = 'pluginId';
  const client = 'client';

  const res = reducer(
    {
      ...getInitialState(),
      activeNotifications: [
        {
          client,
          pluginId,
          notification,
        },
      ],
    },
    clearAllNotifications(),
  );
  expect(res).toEqual({
    ...getInitialState(),
    clearedNotifications: new Set([`${pluginId}#${notification.id}`]),
  });
});

test('reduce setActiveNotifications', () => {
  const pluginId = 'pluginId';
  const client = 'client';

  const res = reducer(
    getInitialState(),
    setActiveNotifications({
      notifications: [notification],
      client,
      pluginId,
    }),
  );
  expect(res).toEqual({
    ...getInitialState(),
    activeNotifications: [
      {
        client,
        pluginId,
        notification,
      },
    ],
  });
});

test('addNotification removes duplicates', () => {
  let res = reducer(
    getInitialState(),
    addNotification({
      pluginId: 'test',
      client: null,
      notification,
    }),
  );
  res = reducer(
    res,
    addNotification({
      pluginId: 'test',
      client: null,
      notification: {
        ...notification,
        id: 'otherId',
      },
    }),
  );
  res = reducer(
    res,
    removeNotification({
      pluginId: 'test',
      client: null,
      notificationId: 'id',
    }),
  );
  expect(res).toMatchInlineSnapshot(`
    Object {
      "activeNotifications": Array [
        Object {
          "client": null,
          "notification": Object {
            "id": "otherId",
            "message": "message",
            "severity": "warning",
            "title": "title",
          },
          "pluginId": "test",
        },
      ],
      "blocklistedCategories": Array [],
      "blocklistedPlugins": Array [],
      "clearedNotifications": Set {},
      "invalidatedNotifications": Array [],
    }
  `);
});

test('reduce removeNotification', () => {
  let res = reducer(
    getInitialState(),
    addNotification({
      pluginId: 'test',
      client: null,
      notification,
    }),
  );
  res = reducer(
    res,
    addNotification({
      pluginId: 'test',
      client: null,
      notification: {
        ...notification,
        id: 'otherId',
      },
    }),
  );
  res = reducer(
    res,
    addNotification({
      pluginId: 'test',
      client: null,
      notification: {
        ...notification,
        message: 'slightly different message',
      },
    }),
  );
  expect(res).toMatchInlineSnapshot(`
    Object {
      "activeNotifications": Array [
        Object {
          "client": null,
          "notification": Object {
            "id": "otherId",
            "message": "message",
            "severity": "warning",
            "title": "title",
          },
          "pluginId": "test",
        },
        Object {
          "client": null,
          "notification": Object {
            "id": "id",
            "message": "slightly different message",
            "severity": "warning",
            "title": "title",
          },
          "pluginId": "test",
        },
      ],
      "blocklistedCategories": Array [],
      "blocklistedPlugins": Array [],
      "clearedNotifications": Set {},
      "invalidatedNotifications": Array [],
    }
  `);
});

test('notifications from plugins arrive in the notifications reducer', async () => {
  const TestPlugin = TestUtils.createTestPlugin({
    plugin(client: PluginClient) {
      client.onUnhandledMessage(() => {
        client.showNotification({
          id: 'test',
          message: 'test message',
          severity: 'error',
          title: 'hi',
          action: 'dosomething',
        });
      });
      return {};
    },
  });

  const {store, client, sendMessage} = await createMockFlipperWithPlugin(
    TestPlugin,
  );
  sendMessage('testMessage', {});
  client.flushMessageBuffer();
  expect(store.getState().notifications).toMatchInlineSnapshot(`
    Object {
      "activeNotifications": Array [
        Object {
          "client": "TestApp#Android#MockAndroidDevice#serial",
          "notification": Object {
            "action": "dosomething",
            "id": "test",
            "message": "test message",
            "severity": "error",
            "title": "hi",
          },
          "pluginId": "TestPlugin",
        },
      ],
      "blocklistedCategories": Array [],
      "blocklistedPlugins": Array [],
      "clearedNotifications": Set {},
      "invalidatedNotifications": Array [],
    }
  `);
});

test('notifications from a device plugin arrive in the notifications reducer', async () => {
  let trigger: any;
  const TestPlugin = TestUtils.createTestDevicePlugin({
    devicePlugin(client: DevicePluginClient) {
      trigger = () => {
        client.showNotification({
          id: 'test',
          message: 'test message',
          severity: 'error',
          title: 'hi',
          action: 'dosomething',
        });
      };
      return {};
    },
  });

  const {store} = await createMockFlipperWithPlugin(TestPlugin);
  trigger();
  expect(store.getState().notifications).toMatchInlineSnapshot(`
    Object {
      "activeNotifications": Array [
        Object {
          "client": "serial",
          "notification": Object {
            "action": "dosomething",
            "id": "test",
            "message": "test message",
            "severity": "error",
            "title": "hi",
          },
          "pluginId": "TestPlugin",
        },
      ],
      "blocklistedCategories": Array [],
      "blocklistedPlugins": Array [],
      "clearedNotifications": Set {},
      "invalidatedNotifications": Array [],
    }
  `);
});

test('errors end up as notifications if crash reporter is active', async () => {
  const TestPlugin = TestUtils.createTestPlugin({
    plugin() {
      return {};
    },
  });

  // eslint-disable-next-line
  const CrashReporterImpl = require('../../../../plugins/public/crash_reporter/index');
  const CrashPlugin = TestUtils.createTestDevicePlugin(CrashReporterImpl, {
    id: 'CrashReporter',
  });

  const {store, client, sendError} = await createMockFlipperWithPlugin(
    TestPlugin,
    {
      additionalPlugins: [CrashPlugin],
    },
  );
  sendError('gone wrong');
  client.flushMessageBuffer();
  expect(store.getState().notifications).toMatchInlineSnapshot(`
    Object {
      "activeNotifications": Array [
        Object {
          "client": "serial",
          "notification": Object {
            "action": "0",
            "category": "\\"gone wrong\\"",
            "id": "0",
            "message": "Callstack: No callstack available",
            "severity": "error",
            "title": "CRASH: Plugin ErrorReason: \\"gone wrong\\"",
          },
          "pluginId": "CrashReporter",
        },
      ],
      "blocklistedCategories": Array [],
      "blocklistedPlugins": Array [],
      "clearedNotifications": Set {},
      "invalidatedNotifications": Array [],
    }
  `);
});

test('errors end NOT up as notifications if crash reporter is active but suppressPluginErrors is disabled', async () => {
  const TestPlugin = TestUtils.createTestPlugin({
    plugin() {
      return {};
    },
  });

  // eslint-disable-next-line
  const CrashReporterImpl = require('../../../../plugins/public/crash_reporter/index');
  const CrashPlugin = TestUtils.createTestDevicePlugin(CrashReporterImpl, {
    id: 'CrashReporter',
  });

  const {store, client, sendError} = await createMockFlipperWithPlugin(
    TestPlugin,
    {
      additionalPlugins: [CrashPlugin],
    },
  );
  store.dispatch({
    type: 'UPDATE_SETTINGS',
    payload: {
      ...store.getState().settingsState,
      suppressPluginErrors: true,
    },
  });
  sendError('gone wrong');
  client.flushMessageBuffer();
  expect(store.getState().notifications).toMatchInlineSnapshot(`
    Object {
      "activeNotifications": Array [],
      "blocklistedCategories": Array [],
      "blocklistedPlugins": Array [],
      "clearedNotifications": Set {},
      "invalidatedNotifications": Array [],
    }
  `);
});
