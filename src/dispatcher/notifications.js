/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {Store} from '../reducers/index.js';
import type Logger from '../fb-stubs/Logger.js';
import type {PluginNotification} from '../reducers/notifications';
import type {FlipperPlugin} from '../plugin.js';

import {ipcRenderer} from 'electron';
import {selectPlugin} from '../reducers/connections';
import {
  setActiveNotifications,
  updatePluginBlacklist,
} from '../reducers/notifications';
import {textContent} from '../utils/index';
import {clientPlugins} from '../plugins/index.js';
import GK from '../fb-stubs/GK';

type NotificationEvents = 'show' | 'click' | 'close' | 'reply' | 'action';

export default (store: Store, logger: Logger) => {
  if (GK.get('flipper_disable_notifications')) {
    return;
  }

  const knownNotifications: Set<string> = new Set();
  const knownPluginStates: Map<string, Object> = new Map();

  ipcRenderer.on(
    'notificationEvent',
    (
      e,
      eventName: NotificationEvents,
      pluginNotification: PluginNotification,
      arg: null | string | number,
    ) => {
      if (eventName === 'click' || (eventName === 'action' && arg === 0)) {
        store.dispatch(
          selectPlugin({
            selectedPlugin: 'notifications',
            selectedApp: null,
            deepLinkPayload: pluginNotification.notification.id,
          }),
        );
      } else if (eventName === 'action') {
        if (arg === 1 && pluginNotification.notification.category) {
          // Hide similar (category)
          logger.track(
            'usage',
            'notification-hide-category',
            pluginNotification,
          );
        } else if (arg === 2) {
          // Hide plugin
          logger.track('usage', 'notification-hide-plugin', pluginNotification);

          const {blacklistedPlugins} = store.getState().notifications;
          if (blacklistedPlugins.indexOf(pluginNotification.pluginId) === -1) {
            store.dispatch(
              updatePluginBlacklist([
                ...blacklistedPlugins,
                pluginNotification.pluginId,
              ]),
            );
          }
        }
      }
    },
  );

  store.subscribe(() => {
    const {notifications, pluginStates} = store.getState();

    const pluginMap: Map<string, Class<FlipperPlugin<>>> = clientPlugins.reduce(
      (acc, cv) => acc.set(cv.id, cv),
      new Map(),
    );

    Object.keys(pluginStates).forEach(key => {
      if (knownPluginStates.get(key) !== pluginStates[key]) {
        knownPluginStates.set(key, pluginStates[key]);
        const [client, pluginId] = key.split('#');
        const persistingPlugin: ?Class<FlipperPlugin<>> = pluginMap.get(
          pluginId,
        );

        if (persistingPlugin && persistingPlugin.getActiveNotifications) {
          store.dispatch(
            setActiveNotifications({
              notifications: persistingPlugin.getActiveNotifications(
                pluginStates[key],
              ),
              client,
              pluginId,
            }),
          );
        }
      }
    });

    const {activeNotifications, blacklistedPlugins} = notifications;

    activeNotifications.forEach((n: PluginNotification) => {
      if (
        store.getState().connections.selectedPlugin !== 'notifications' &&
        !knownNotifications.has(n.notification.id) &&
        blacklistedPlugins.indexOf(n.pluginId) === -1
      ) {
        ipcRenderer.send('sendNotification', {
          payload: {
            title: n.notification.title,
            body: textContent(n.notification.message),
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
                text: `Hide all ${pluginMap.get(n.pluginId)?.title || ''}`,
              },
            ],
            closeButtonText: 'Hide',
          },
          closeAfter: 10000,
          pluginNotification: n,
        });
        logger.track('usage', 'native-notification', n.notification);
        knownNotifications.add(n.notification.id);
      }
    });
  });
};
