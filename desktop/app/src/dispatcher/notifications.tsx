/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Store} from '../reducers/index';
import {Logger} from '../fb-interfaces/Logger';
import {PluginNotification} from '../reducers/notifications';
import {ipcRenderer, IpcRendererEvent} from 'electron';
import {
  updatePluginBlocklist,
  updateCategoryBlocklist,
} from '../reducers/notifications';
import {textContent} from 'flipper-plugin';
import {getPluginTitle} from '../utils/pluginUtils';
import {sideEffect} from '../utils/sideEffect';
import {openNotification} from '../sandy-chrome/notification/Notification';

type NotificationEvents = 'show' | 'click' | 'close' | 'reply' | 'action';
const NOTIFICATION_THROTTLE = 5 * 1000; // in milliseconds

export default (store: Store, logger: Logger) => {
  const knownNotifications: Set<string> = new Set();
  const lastNotificationTime: Map<string, number> = new Map();

  ipcRenderer.on(
    'notificationEvent',
    (
      _event: IpcRendererEvent,
      eventName: NotificationEvents,
      pluginNotification: PluginNotification,
      arg: null | string | number,
    ) => {
      if (eventName === 'click' || (eventName === 'action' && arg === 0)) {
        openNotification(store, pluginNotification);
      } else if (eventName === 'action') {
        if (arg === 1 && pluginNotification.notification.category) {
          // Hide similar (category)
          logger.track(
            'usage',
            'notification-hide-category',
            pluginNotification,
          );

          const {category} = pluginNotification.notification;
          const {blocklistedCategories} = store.getState().notifications;
          if (category && blocklistedCategories.indexOf(category) === -1) {
            store.dispatch(
              updateCategoryBlocklist([...blocklistedCategories, category]),
            );
          }
        } else if (arg === 2) {
          // Hide plugin
          logger.track('usage', 'notification-hide-plugin', pluginNotification);

          const {blocklistedPlugins} = store.getState().notifications;
          if (blocklistedPlugins.indexOf(pluginNotification.pluginId) === -1) {
            store.dispatch(
              updatePluginBlocklist([
                ...blocklistedPlugins,
                pluginNotification.pluginId,
              ]),
            );
          }
        }
      }
    },
  );

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
            const plugin = getPlugin(n.pluginId);
            ipcRenderer.send('sendNotification', {
              payload: {
                title: n.notification.title,
                body: n.notification.message,
                actions: [
                  {
                    type: 'button',
                    text: 'Show',
                  },
                  {
                    type: 'button',
                    text: 'Hide similar',
                  },
                  {
                    type: 'button',
                    text: `Hide all ${
                      plugin != null ? getPluginTitle(plugin) : ''
                    }`,
                  },
                ],
                closeButtonText: 'Hide',
              },
              closeAfter: 10000,
              pluginNotification: n,
            });
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
