/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  ACTIVE_SHEET_SIGN_IN,
  setActiveSheet,
  setPastedToken,
  toggleAction,
} from './reducers/application';
import {Group, SUPPORTED_GROUPS} from './reducers/supportForm';
import {Store} from './reducers/index';
import {importDataToStore} from './utils/exportData';
import {selectPlugin} from './reducers/connections';
import {Dialog} from 'flipper-plugin';
import {handleOpenPluginDeeplink} from './dispatcher/handleOpenPluginDeeplink';

const UNKNOWN = 'Unknown deeplink';
/**
 * Handle a flipper:// deeplink. Will throw if the URL pattern couldn't be recognised
 */
export async function handleDeeplink(
  store: Store,
  query: string,
): Promise<void> {
  const uri = new URL(query);
  if (uri.protocol !== 'flipper:') {
    throw new Error(UNKNOWN);
  }
  if (uri.href.startsWith('flipper://open-plugin')) {
    return handleOpenPluginDeeplink(store, query);
  }
  if (uri.pathname.match(/^\/*import\/*$/)) {
    const url = uri.searchParams.get('url');
    store.dispatch(toggleAction('downloadingImportData', true));
    if (url) {
      return fetch(url)
        .then((res) => res.text())
        .then((data) => importDataToStore(url, data, store))
        .then(() => {
          store.dispatch(toggleAction('downloadingImportData', false));
        })
        .catch((e: Error) => {
          console.error('Failed to download Flipper trace' + e);
          store.dispatch(toggleAction('downloadingImportData', false));
          throw e;
        });
    }
    throw new Error(UNKNOWN);
  } else if (uri.pathname.match(/^\/*support-form\/*$/)) {
    const formParam = uri.searchParams.get('form');
    const grp = deeplinkFormParamToGroups(formParam);
    if (grp) {
      grp.handleSupportFormDeeplinks(store);
      return;
    }
    throw new Error(UNKNOWN);
  } else if (uri.pathname.match(/^\/*login\/*$/)) {
    const token = uri.searchParams.get('token');
    store.dispatch(setPastedToken(token ?? undefined));
    if (store.getState().application.activeSheet !== ACTIVE_SHEET_SIGN_IN) {
      store.dispatch(setActiveSheet(ACTIVE_SHEET_SIGN_IN));
    }
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
    store.dispatch(
      selectPlugin({
        selectedApp: match[0],
        selectedPlugin: match[1],
        deepLinkPayload: match[2],
      }),
    );
    return;
  } else {
    throw new Error(UNKNOWN);
  }
}

function deeplinkFormParamToGroups(
  formParam: string | null,
): Group | undefined {
  if (!formParam) {
    return undefined;
  }
  return SUPPORTED_GROUPS.find((grp) => {
    return grp.deeplinkSuffix.toLowerCase() === formParam.toLowerCase();
  });
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
      await handleDeeplink(store, deeplink);
      return deeplink;
    },
  });
}
