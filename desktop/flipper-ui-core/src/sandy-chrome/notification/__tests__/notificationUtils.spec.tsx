/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {PluginNotification} from '../../../reducers/notifications';
import {filterNotifications} from '../notificationUtils';

const PLUGIN_COUNT = 3;
const CLIENT_COUNT = 2;
const CATEGORY_LABEL_COUNT = 2 * PLUGIN_COUNT * CLIENT_COUNT;
const CATEGORY_LABEL = 'some category';

const unfilteredNotifications: Array<PluginNotification> = [...Array(20)].map(
  (_, idx) => ({
    notification: {
      id: `${idx}`,
      title: `title ${idx}`,
      message: `message ${idx}`,
      severity: 'warning',
      category: idx % CATEGORY_LABEL_COUNT ? undefined : CATEGORY_LABEL,
    },
    pluginId: `plugin_${idx % PLUGIN_COUNT}`,
    client: `client_${idx % CLIENT_COUNT}`,
  }),
);

test('Filter nothing', async () => {
  const filteredNotifications = filterNotifications(
    unfilteredNotifications.slice(),
  );
  expect(filteredNotifications.length).toBe(unfilteredNotifications.length);
  expect(filteredNotifications).toEqual(unfilteredNotifications);
});

test('Filter by single pluginId', async () => {
  const blockedPluginId = 'plugin_0';
  const filteredNotifications = filterNotifications(
    unfilteredNotifications.slice(),
    [blockedPluginId],
  );
  const expectedNotification = unfilteredNotifications
    .slice()
    .filter((_, idx) => idx % PLUGIN_COUNT);

  expect(filteredNotifications.length).toBe(expectedNotification.length);
  expect(filteredNotifications).toEqual(expectedNotification);
});

test('Filter by multiple pluginId', async () => {
  const blockedPluginIds = ['plugin_1', 'plugin_2'];
  const filteredNotifications = filterNotifications(
    unfilteredNotifications.slice(),
    blockedPluginIds,
  );
  const expectedNotification = unfilteredNotifications
    .slice()
    .filter((_, idx) => !(idx % PLUGIN_COUNT));

  expect(filteredNotifications.length).toBe(expectedNotification.length);
  expect(filteredNotifications).toEqual(expectedNotification);
});

test('Filter by category', async () => {
  const blockedCategory = CATEGORY_LABEL;
  const filteredNotifications = filterNotifications(
    unfilteredNotifications.slice(),
    [],
    [blockedCategory],
  );
  const expectedNotification = unfilteredNotifications
    .slice()
    .filter((_, idx) => idx % CATEGORY_LABEL_COUNT);

  expect(filteredNotifications.length).toBe(expectedNotification.length);
  expect(filteredNotifications).toEqual(expectedNotification);
});

test('Filter by pluginId and category', async () => {
  const blockedCategory = CATEGORY_LABEL;
  const blockedPluginId = 'plugin_1';
  const filteredNotifications = filterNotifications(
    unfilteredNotifications.slice(),
    [blockedPluginId],
    [blockedCategory],
  );
  const expectedNotification = unfilteredNotifications
    .slice()
    .filter((_, idx) => idx % CATEGORY_LABEL_COUNT && idx % PLUGIN_COUNT !== 1);

  expect(filteredNotifications.length).toBe(expectedNotification.length);
  expect(filteredNotifications).toEqual(expectedNotification);
});

test('Filter by string searching', async () => {
  const searchString = 'age 5';
  const filteredNotifications = filterNotifications(
    unfilteredNotifications.slice(),
    [],
    [],
    searchString,
  );
  const expectedNotification = [unfilteredNotifications[5]];

  expect(filteredNotifications.length).toBe(expectedNotification.length);
  expect(filteredNotifications).toEqual(expectedNotification);
});
