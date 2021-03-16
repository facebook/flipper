/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {State, addNotification, removeNotification} from '../notifications';

import {
  default as reducer,
  setActiveNotifications,
  clearAllNotifications,
  updatePluginBlocklist,
  updateCategoryBlocklist,
} from '../notifications';

import {Notification} from 'flipper-plugin';

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
