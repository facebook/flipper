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

import {selectPlugin} from '../reducers/connections';
import {setActiveNotifications} from '../reducers/notifications';
import {textContent} from '../utils/index';
import {clientPlugins} from '../plugins/index.js';
import GK from '../fb-stubs/GK';

export default (store: Store, logger: Logger) => {
  if (GK.get('flipper_disable_notifications')) {
    return;
  }

  const knownNotifications: Set<string> = new Set();
  const knownPluginStates: Map<string, Object> = new Map();

  store.subscribe(() => {
    const {notifications, pluginStates} = store.getState();

    Object.keys(pluginStates).forEach(key => {
      if (knownPluginStates.get(key) !== pluginStates[key]) {
        knownPluginStates.set(key, pluginStates[key]);
        const [client, pluginId] = key.split('#');
        const persistingPlugin: ?Class<FlipperPlugin<>> = clientPlugins.find(
          (p: Class<FlipperPlugin<>>) =>
            p.id === pluginId && p.getActiveNotifications,
        );

        if (persistingPlugin) {
          store.dispatch(
            setActiveNotifications({
              // $FlowFixMe: Ensured getActiveNotifications is implemented in filter
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
        !knownNotifications.has(n.notification.id) &&
        blacklistedPlugins.indexOf(n.pluginId) === -1
      ) {
        const notification = new window.Notification(n.notification.title, {
          body: textContent(n.notification.message),
        });
        logger.track('usage', 'native-notification', n.notification);
        notification.onclick = () =>
          store.dispatch(
            selectPlugin({
              selectedPlugin: 'notifications',
              selectedApp: null,
              deepLinkPayload: n.notification.id,
            }),
          );
        knownNotifications.add(n.notification.id);
      }
    });
  });
};
