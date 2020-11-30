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
import {PluginDefinition, isSandyPlugin} from '../plugin';
import isHeadless from '../utils/isHeadless';
import {setStaticView} from '../reducers/connections';
import {ipcRenderer, IpcRendererEvent} from 'electron';
import {
  setActiveNotifications,
  updatePluginBlocklist,
  updateCategoryBlocklist,
} from '../reducers/notifications';
import {textContent} from '../utils/index';
import GK from '../fb-stubs/GK';
import {deconstructPluginKey} from '../utils/clientUtils';
import NotificationScreen from '../chrome/NotificationScreen';
import {getPluginTitle} from '../utils/pluginUtils';
import {sideEffect} from '../utils/sideEffect';

type NotificationEvents = 'show' | 'click' | 'close' | 'reply' | 'action';
const NOTIFICATION_THROTTLE = 5 * 1000; // in milliseconds

export default (store: Store, logger: Logger) => {
  if (GK.get('flipper_disable_notifications')) {
    return;
  }

  const knownNotifications: Set<string> = new Set();
  const knownPluginStates: Map<string, Object> = new Map();
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
        store.dispatch(
          setStaticView(
            NotificationScreen,
            pluginNotification.notification.action ?? null,
          ),
        );
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
    ({notifications, pluginStates, plugins}) => ({
      notifications,
      pluginStates,
      devicePlugins: plugins.devicePlugins,
      clientPlugins: plugins.clientPlugins,
    }),
    ({notifications, pluginStates, devicePlugins, clientPlugins}, store) => {
      function getPlugin(name: string) {
        return devicePlugins.get(name) ?? clientPlugins.get(name);
      }

      Object.keys(pluginStates).forEach((key) => {
        if (knownPluginStates.get(key) !== pluginStates[key]) {
          knownPluginStates.set(key, pluginStates[key]);
          const plugin = deconstructPluginKey(key);
          const pluginName = plugin.pluginName;
          const client = plugin.client;

          if (!pluginName) {
            return;
          }

          const persistingPlugin: undefined | PluginDefinition = getPlugin(
            pluginName,
          );
          // TODO: add support for Sandy plugins T68683442
          if (
            persistingPlugin &&
            !isSandyPlugin(persistingPlugin) &&
            persistingPlugin.getActiveNotifications
          ) {
            try {
              const notifications = persistingPlugin.getActiveNotifications(
                pluginStates[key],
              );
              store.dispatch(
                setActiveNotifications({
                  notifications,
                  client,
                  pluginId: pluginName,
                }),
              );
            } catch (e) {
              console.error(
                'Failed to compute notifications for plugin ' + pluginName,
                e,
              );
            }
          }
        }
      });

      const {
        activeNotifications,
        blocklistedPlugins,
        blocklistedCategories,
      } = notifications;

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
            !isHeadless() &&
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
