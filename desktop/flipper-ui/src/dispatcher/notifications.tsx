/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Store} from '../reducers/index';
import {Logger} from 'flipper-common';
import {PluginNotification} from '../reducers/notifications';
import {textContent} from 'flipper-plugin';
import {sideEffect} from '../utils/sideEffect';

export type NotificationEvents =
  | 'show'
  | 'click'
  | 'close'
  | 'reply'
  | 'action';

const NOTIFICATION_THROTTLE = 5 * 1000; // in milliseconds

export default (store: Store, logger: Logger) => {
  const knownNotifications: Set<string> = new Set();
  const lastNotificationTime: Map<string, number> = new Map();

  sideEffect(
    store,
    {name: 'notifications', throttleMs: 500},
    ({notifications, plugins}) => ({
      notifications,
      devicePlugins: plugins.devicePlugins,
      clientPlugins: plugins.clientPlugins,
    }),
    ({notifications, devicePlugins, clientPlugins}, store) => {
      function getPlugin(name: string) {
        return devicePlugins.get(name) ?? clientPlugins.get(name);
      }

      const {activeNotifications, blocklistedPlugins, blocklistedCategories} =
        notifications;

      activeNotifications
        .map((n) => ({
          ...n,
          notification: {
            ...n.notification,
            message: textContent(n.notification.message),
          },
        }))
        .forEach((n: PluginNotification) => {
          if (
            store.getState().connections.selectedPlugin !== 'notifications' &&
            !knownNotifications.has(n.notification.id) &&
            blocklistedPlugins.indexOf(n.pluginId) === -1 &&
            (!n.notification.category ||
              blocklistedCategories.indexOf(n.notification.category) === -1)
          ) {
            const prevNotificationTime: number =
              lastNotificationTime.get(n.pluginId) || 0;
            lastNotificationTime.set(n.pluginId, new Date().getTime());
            knownNotifications.add(n.notification.id);

            if (
              new Date().getTime() - prevNotificationTime <
              NOTIFICATION_THROTTLE
            ) {
              // Don't send a notification if the plugin has sent a notification
              // within the NOTIFICATION_THROTTLE.
              return;
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const plugin = getPlugin(n.pluginId);
            // getRenderHostInstance().sendIpcEvent('sendNotification', {
            //   payload: {
            //     title: n.notification.title,
            //     body: reactElementToJSXString(n.notification.message),
            //     actions: [
            //       {
            //         type: 'button',
            //         text: 'Show',
            //       },
            //       {
            //         type: 'button',
            //         text: 'Hide similar',
            //       },
            //       {
            //         type: 'button',
            //         text: `Hide all ${
            //           plugin != null ? getPluginTitle(plugin) : ''
            //         }`,
            //       },
            //     ],
            //     closeButtonText: 'Hide',
            //   },
            //   closeAfter: 10000,
            //   pluginNotification: n,
            // });
            logger.track('usage', 'native-notification', {
              ...n.notification,
              message:
                typeof n.notification.message === 'string'
                  ? n.notification.message
                  : '<ReactNode>',
            });
          }
        });
    },
  );
};
