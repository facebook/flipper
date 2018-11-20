/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {State} from '../notifications';

import {
  default as reducer,
  setActiveNotifications,
  clearAllNotifications,
  updatePluginBlacklist,
  updateCategoryBlacklist,
} from '../notifications';

const notification = {
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
