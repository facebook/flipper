/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {PluginNotification} from '../../reducers/notifications';

export function filterNotifications(
  notifications: Array<PluginNotification>,
  blocklistedPlugins?: Array<string>,
  blocklistedCategories?: Array<string>,
  searchString?: string,
): Array<PluginNotification> {
  return notifications
    .filter((noti) =>
      blocklistedPlugins ? !blocklistedPlugins.includes(noti.pluginId) : true,
    )
    .filter((noti) =>
      blocklistedCategories && noti.notification.category
        ? !blocklistedCategories?.includes(noti.notification.category)
        : true,
    )
    .filter((noti) =>
      searchString
        ? noti.notification.title
            .toLocaleLowerCase()
            .includes(searchString.toLocaleLowerCase()) ||
          (typeof noti.notification.message === 'string'
            ? noti.notification.message
                .toLocaleLowerCase()
                .includes(searchString.toLocaleLowerCase())
            : false)
        : true,
    );
}
