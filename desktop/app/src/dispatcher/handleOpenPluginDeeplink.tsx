/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Dialog, getFlipperLib} from 'flipper-plugin';
import {getUser} from '../fb-stubs/user';
import {Store} from '../reducers/index';
// import {checkForUpdate} from '../fb-stubs/checkForUpdate';
// import {getAppVersion} from '../utils/info';
import {ACTIVE_SHEET_SIGN_IN, setActiveSheet} from '../reducers/application';
import {UserNotSignedInError} from '../utils/errors';
import {selectPlugin} from '../reducers/connections';

type OpenPluginParams = {
  pluginId: string;
  client: string | undefined;
  devices: string[];
  payload: string | undefined;
};

export function parseOpenPluginParams(query: string): OpenPluginParams {
  // 'flipper://open-plugin?plugin-id=graphql&client=facebook&devices=android,ios&chrome=1&payload='
  const url = new URL(query);
  const params = new Map<string, string>(url.searchParams as any);
  if (!params.has('plugin-id')) {
    throw new Error('Missing plugin-id param');
  }
  return {
    pluginId: params.get('plugin-id')!,
    client: params.get('client'),
    devices: params.get('devices')?.split(',') ?? [],
    payload: params.get('payload')
      ? decodeURIComponent(params.get('payload')!)
      : undefined,
  };
}

export async function handleOpenPluginDeeplink(store: Store, query: string) {
  const params = parseOpenPluginParams(query);

  if (!(await verifyLighthouseAndUserLoggedIn(store, params))) {
    return;
  }
  // await verifyFlipperIsUpToDate();
  // await verifyPluginInstalled();
  // await verifyDevices();
  // await verifyClient();
  // await verifyPluginEnabled();
  await openPlugin(store, params);
}

// check if user is connected to VPN and logged in. Returns true if OK, or false if aborted
async function verifyLighthouseAndUserLoggedIn(
  store: Store,
  params: OpenPluginParams,
): Promise<boolean> {
  if (!getFlipperLib().isFB || process.env.NODE_ENV === 'test') {
    return true; // ok, continue
  }

  const title = `Starting plugin ${params.pluginId}…`;

  // repeat until connection succeeded
  while (true) {
    const spinnerDialog = Dialog.loading({
      title,
      message: 'Checking connection to Facebook Intern',
    });

    try {
      const user = await getUser();
      spinnerDialog.close();
      // User is logged in
      if (user) {
        return true;
      } else {
        // Connected, but not logged in or no valid profile object returned
        return await showPleaseLoginDialog(store, title);
      }
    } catch (e) {
      spinnerDialog.close();
      if (e instanceof UserNotSignedInError) {
        // connection, but user is not logged in
        return await showPleaseLoginDialog(store, title);
      }
      // General connection error.
      // Not connected (to presumably) intern at all
      if (
        !(await Dialog.confirm({
          title,
          message:
            'It looks you are currently not connected to Lighthouse / VPN. Please connect and retry.',
          okText: 'Retry',
        }))
      ) {
        return false;
      }
    }
  }
}

async function showPleaseLoginDialog(
  store: Store,
  title: string,
): Promise<boolean> {
  if (
    !(await Dialog.confirm({
      title,
      message: 'You are currently not logged in, please login.',
      okText: 'Login',
    }))
  ) {
    // cancelled login
    return false;
  }

  store.dispatch(setActiveSheet(ACTIVE_SHEET_SIGN_IN));
  // wait until login succeeded
  await waitForLogin(store);
  return true;
}

async function waitForLogin(store: Store) {
  return new Promise<void>((resolve) => {
    const unsub = store.subscribe(() => {
      if (store.getState().user?.id) {
        unsub();
        resolve();
      }
    });
  });
}

function openPlugin(store: Store, params: OpenPluginParams) {
  store.dispatch(
    selectPlugin({
      selectedApp: params.client,
      selectedPlugin: params.pluginId,
      deepLinkPayload: params.payload,
    }),
  );
}
