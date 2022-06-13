/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {getLogger, Logger} from 'flipper-common';
import {Store} from './reducers/index';
import {importDataToStore} from './utils/exportData';
import {selectPlugin, getAllClients} from './reducers/connections';
import {Dialog} from 'flipper-plugin';
import {handleOpenPluginDeeplink} from './dispatcher/handleOpenPluginDeeplink';
import {message} from 'antd';
import {showLoginDialog} from './chrome/fb-stubs/SignInSheet';
import {track} from './deeplinkTracking';

const UNKNOWN = 'Unknown deeplink';
/**
 * Handle a flipper:// deeplink. Will throw if the URL pattern couldn't be recognised
 */
export async function handleDeeplink(
  store: Store,
  logger: Logger,
  query: string,
): Promise<void> {
  const trackInteraction = track.bind(null, logger, query);
  const unknownError = () => {
    trackInteraction({
      state: 'ERROR',
      errorMessage: UNKNOWN,
    });
    throw new Error(UNKNOWN);
  };
  const uri = new URL(query);

  trackInteraction({
    state: 'INIT',
  });
  if (uri.protocol !== 'flipper:') {
    throw unknownError();
  }
  if (uri.href === 'flipper://' || uri.pathname === '//welcome') {
    // We support an empty protocol for just opening Flipper from anywhere
    // or alternatively flipper://welcome to open the welcome screen.
    return;
  }
  if (uri.href.startsWith('flipper://open-plugin')) {
    return handleOpenPluginDeeplink(store, query, trackInteraction);
  }
  if (uri.pathname.match(/^\/*import\/*$/)) {
    const url = uri.searchParams.get('url');
    if (url) {
      const handle = Dialog.loading({
        message: 'Importing Flipper trace...',
      });
      return fetch(url)
        .then((res) => res.text())
        .then((data) => importDataToStore(url, data, store))
        .catch((e: Error) => {
          console.warn('Failed to download Flipper trace', e);
          message.error({
            duration: 0,
            content: 'Failed to download Flipper trace: ' + e,
          });
        })
        .finally(() => {
          handle.close();
        });
    }
    throw unknownError();
  } else if (uri.pathname.match(/^\/*login\/*$/)) {
    const token = uri.searchParams.get('token');
    showLoginDialog(token ?? '');
    return;
  }
  const match = uriComponents(query);
  if (match.length > 1) {
    // deprecated, use the open-plugin format instead, which is more flexible
    // and will guide the user through any necessary set up steps
    // flipper://<client>/<pluginId>/<payload>
    console.warn(
      `Deprecated deeplink format: '${query}', use 'flipper://open-plugin?plugin-id=${
        match[1]
      }&client=${match[0]}&payload=${encodeURIComponent(match[2])}' instead.`,
    );
    const deepLinkPayload = match[2];
    const deepLinkParams = new URLSearchParams(deepLinkPayload);
    const deviceParam = deepLinkParams.get('device');

    // if there is a device Param, find a matching device
    const selectedDevice = deviceParam
      ? store
          .getState()
          .connections.devices.find((v) => v.title === deviceParam)
      : undefined;

    // if a client is specified, find it, withing the device if applicable
    const selectedClient = getAllClients(store.getState().connections).find(
      (c) =>
        c.query.app === match[0] &&
        (selectedDevice == null || c.device === selectedDevice),
    );

    store.dispatch(
      selectPlugin({
        selectedAppId: selectedClient?.id,
        selectedDevice: selectedClient ? selectedClient.device : selectedDevice,
        selectedPlugin: match[1],
        deepLinkPayload,
      }),
    );
    return;
  } else {
    throw unknownError();
  }
}

export const uriComponents = (url: string): Array<string> => {
  if (!url) {
    return [];
  }
  const match: Array<string> | undefined | null = url.match(
    /^flipper:\/\/([^\/]*)\/([^\/\?]*)\/?(.*)$/,
  );
  if (match) {
    return match.map(decodeURIComponent).slice(1).filter(Boolean);
  }
  return [];
};

export function openDeeplinkDialog(store: Store) {
  Dialog.prompt({
    title: 'Open deeplink',
    message: 'Enter a deeplink:',
    defaultValue: 'flipper://',
    onConfirm: async (deeplink) => {
      await handleDeeplink(store, getLogger(), deeplink);
      return deeplink;
    },
  });
}
