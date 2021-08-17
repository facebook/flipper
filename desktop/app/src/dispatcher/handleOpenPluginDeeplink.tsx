/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Dialog, getFlipperLib} from 'flipper-plugin';
import {getUser} from '../fb-stubs/user';
import {State, Store} from '../reducers/index';
import {checkForUpdate} from '../fb-stubs/checkForUpdate';
import {getAppVersion} from '../utils/info';
import {ACTIVE_SHEET_SIGN_IN, setActiveSheet} from '../reducers/application';
import {UserNotSignedInError} from '../utils/errors';
import {selectPlugin} from '../reducers/connections';
import {getUpdateAvailableMessage} from '../chrome/UpdateIndicator';
import {Typography} from 'antd';
import {getPluginStatus} from '../utils/pluginUtils';
import {loadPluginsFromMarketplace} from './fb-stubs/pluginMarketplace';
import {loadPlugin} from '../reducers/pluginManager';
import {startPluginDownload} from '../reducers/pluginDownloads';
import isProduction, {isTest} from '../utils/isProduction';
import restart from '../utils/restartFlipper';

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
  const title = `Starting plugin ${params.pluginId}…`;

  if (!(await verifyLighthouseAndUserLoggedIn(store, title))) {
    return;
  }
  await verifyFlipperIsUpToDate(title);
  if (!(await verifyPluginStatus(store, params.pluginId, title))) {
    return;
  }
  // await verifyDevices();
  // await verifyClient();
  // await verifyPluginEnabled();
  await openPlugin(store, params);
}

// check if user is connected to VPN and logged in. Returns true if OK, or false if aborted
async function verifyLighthouseAndUserLoggedIn(
  store: Store,
  title: string,
): Promise<boolean> {
  if (!getFlipperLib().isFB || process.env.NODE_ENV === 'test') {
    return true; // ok, continue
  }

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
  return waitFor(store, (state) => !!state.user?.id);
}

// make this more reusable?
function waitFor(
  store: Store,
  predicate: (state: State) => boolean,
): Promise<void> {
  return new Promise<void>((resolve) => {
    const unsub = store.subscribe(() => {
      if (predicate(store.getState())) {
        unsub();
        resolve();
      }
    });
  });
}

async function verifyFlipperIsUpToDate(title: string) {
  if (!isProduction() || isTest()) {
    return;
  }
  const currentVersion = getAppVersion();
  const handle = Dialog.loading({
    title,
    message: 'Checking if Flipper is up-to-date',
  });
  try {
    const result = await checkForUpdate(currentVersion);
    handle.close();
    switch (result.kind) {
      case 'error':
        // if we can't tell if we're up to date, we don't want to halt the process on that.
        console.warn('Failed to verify Flipper version', result);
        return;
      case 'up-to-date':
        return;
      case 'update-available':
        await Dialog.confirm({
          title,
          message: (
            <Typography.Text>
              {getUpdateAvailableMessage(result)}
            </Typography.Text>
          ),
          okText: 'Skip',
        });
        return;
    }
  } catch (e) {
    // if we can't tell if we're up to date, we don't want to halt the process on that.
    console.warn('Failed to verify Flipper version', e);
    handle.close();
  }
}

async function verifyPluginStatus(
  store: Store,
  pluginId: string,
  title: string,
): Promise<boolean> {
  // make sure we have marketplace plugin data present
  if (!isTest() && !store.getState().plugins.marketplacePlugins.length) {
    // plugins not yet fetched
    // updates plugins from marketplace (if logged in), and stores them
    await loadPluginsFromMarketplace();
  }
  // while true loop; after pressing install or add GK, we want to check again if plugin is available
  while (true) {
    const [status, reason] = getPluginStatus(store, pluginId);
    switch (status) {
      case 'ready':
        return true;
      case 'unknown':
        await Dialog.alert({
          type: 'warning',
          title,
          message: `No plugin with id '${pluginId}' is known to Flipper. Please correct the deeplink, or install the plugin from NPM using the plugin manager.`,
        });
        return false;
      case 'failed':
        await Dialog.alert({
          type: 'error',
          title,
          message: `We found plugin '${pluginId}', but failed to load it: ${reason}. Please check the logs for more details`,
        });
        return false;
      case 'gatekeeped':
        if (
          !(await Dialog.confirm({
            title,
            message: (
              <p>
                {`To use plugin '${pluginId}', it is necessary to be a member of the GK '${reason}'. Click `}
                <Typography.Link
                  href={`https://www.internalfb.com/intern/gatekeeper/projects/${reason}`}>
                  here
                </Typography.Link>{' '}
                to enroll, restart Flipper, and click the link again.
              </p>
            ),
            okText: 'Restart',
            onConfirm: async () => {
              restart();
              // intentionally forever pending, we're restarting...
              return new Promise(() => {});
            },
          }))
        ) {
          return false;
        }
        break;
      case 'bundle_installable': {
        // For convenience, don't ask user to install bundled plugins, handle it directly
        await installBundledPlugin(store, pluginId, title);
        break;
      }
      case 'marketplace_installable': {
        if (!(await installMarketPlacePlugin(store, pluginId, title))) {
          return false;
        }
        break;
      }
      default:
        throw new Error('Unhandled state: ' + status);
    }
  }
}

async function installBundledPlugin(
  store: Store,
  pluginId: string,
  title: string,
) {
  const plugin = store.getState().plugins.bundledPlugins.get(pluginId);
  if (!plugin || !plugin.isBundled) {
    throw new Error(`Failed to find bundled plugin '${pluginId}'`);
  }
  const loadingDialog = Dialog.loading({
    title,
    message: `Loading plugin '${pluginId}'...`,
  });
  store.dispatch(loadPlugin({plugin, enable: true, notifyIfFailed: true}));
  try {
    await waitFor(
      store,
      () => getPluginStatus(store, pluginId)[0] !== 'bundle_installable',
    );
  } finally {
    loadingDialog.close();
  }
}

async function installMarketPlacePlugin(
  store: Store,
  pluginId: string,
  title: string,
): Promise<boolean> {
  if (
    !(await Dialog.confirm({
      title,
      message: `The requested plugin '${pluginId}' is currently not installed, but can be downloaded from the Flipper plugin Marketplace. If you trust the source of the current link, press 'Install' to continue`,
      okText: 'Install',
    }))
  ) {
    return false;
  }
  const plugin = store
    .getState()
    .plugins.marketplacePlugins.find((p) => p.id === pluginId);
  if (!plugin) {
    throw new Error(`Failed to find marketplace plugin '${pluginId}'`);
  }
  const loadingDialog = Dialog.loading({
    title,
    message: `Installing plugin '${pluginId}'...`,
  });
  try {
    store.dispatch(startPluginDownload({plugin, startedByUser: true}));
    await waitFor(
      store,
      () => getPluginStatus(store, pluginId)[0] !== 'marketplace_installable',
    );
  } finally {
    loadingDialog.close();
  }
  return true;
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
