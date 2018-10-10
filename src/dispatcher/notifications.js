/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {Store} from '../reducers/index.js';
import type Logger from '../fb-stubs/Logger.js';
import type {PluginNotification} from '../reducers/notifications';

import {selectPlugin} from '../reducers/connections';
import {textContent} from '../utils/index';

export default (store: Store, logger: Logger) => {
  const knownNotifications: Set<string> = new Set();
  store.subscribe(() => {
    const {
      activeNotifications,
      blacklistedPlugins,
    } = store.getState().notifications;

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
              selectedPlugin: n.pluginId,
              selectedApp: n.client,
              deepLinkPayload: n.notification.action,
            }),
          );
        knownNotifications.add(n.notification.id);
      }
    });
  });
};
