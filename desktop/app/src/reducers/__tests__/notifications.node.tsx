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
  updatePluginBlacklist,
  updateCategoryBlacklist,
} from '../notifications';

import {Notification} from '../../plugin';

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
    blacklistedPlugins: [],
    blacklistedCategories: [],
    clearedNotifications: new Set(),
  };
}

test('reduce updateCategoryBlacklist', () => {
  const blacklistedCategories = ['blacklistedCategory'];
  const res = reducer(
    getInitialState(),
    updateCategoryBlacklist(blacklistedCategories),
  );
  expect(res).toEqual({
    ...getInitialState(),
    blacklistedCategories,
  });
});

test('reduce updatePluginBlacklist', () => {
  const blacklistedPlugins = ['blacklistedPlugin'];
  const res = reducer(
    getInitialState(),
    updatePluginBlacklist(blacklistedPlugins),
  );
  expect(res).toEqual({
    ...getInitialState(),
    blacklistedPlugins,
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
      "blacklistedCategories": Array [],
      "blacklistedPlugins": Array [],
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
      "blacklistedCategories": Array [],
      "blacklistedPlugins": Array [],
      "clearedNotifications": Set {},
      "invalidatedNotifications": Array [],
    }
  `);
});
