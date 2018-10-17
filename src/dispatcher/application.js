/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {remote, ipcRenderer} from 'electron';
import type {Store} from '../reducers/index.js';
import type Logger from '../fb-stubs/Logger.js';

import {selectPlugin, userPreferredPlugin} from '../reducers/connections';
export const uriComponents = (url: string) => {
  if (!url) {
    return [];
  }
  const match: ?Array<string> = url.match(
    /^flipper:\/\/([^\/]*)\/([^\/]*)\/?(.*)$/,
  );
  if (match) {
    return (match
      .map(decodeURIComponent)
      .slice(1)
      .filter(Boolean): Array<string>);
  }
  return [];
};

export default (store: Store, logger: Logger) => {
  const currentWindow = remote.getCurrentWindow();
  currentWindow.on('focus', () => {
    store.dispatch({
      type: 'windowIsFocused',
      payload: true,
    });
  });
  currentWindow.on('blur', () => {
    store.dispatch({
      type: 'windowIsFocused',
      payload: false,
    });
  });

  ipcRenderer.on('flipper-deeplink', (event, url) => {
    // flipper://<client>/<pluginId>/<payload>
    const match = uriComponents(url);
    if (match.length > 1) {
      store.dispatch(
        selectPlugin({
          selectedApp: match[0],
          selectedPlugin: match[1],
          deepLinkPayload: match[2],
        }),
      );
    }
  });
  ipcRenderer.on('flipper-deeplink-preferred-plugin', (event, url) => {
    // flipper://<client>/<pluginId>/<payload>
    const match = uriComponents(url);
    if (match.length > 1) {
      store.dispatch(userPreferredPlugin(match[1]));
    }
  });
};
