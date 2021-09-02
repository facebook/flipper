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
import {selectPlugin, setPluginEnabled} from '../reducers/connections';
import {getUpdateAvailableMessage} from '../chrome/UpdateIndicator';
import {Typography} from 'antd';
import {getPluginStatus} from '../utils/pluginUtils';
import {loadPluginsFromMarketplace} from './fb-stubs/pluginMarketplace';
import {loadPlugin, switchPlugin} from '../reducers/pluginManager';
import {startPluginDownload} from '../reducers/pluginDownloads';
import isProduction, {isTest} from '../utils/isProduction';
import restart from '../utils/restartFlipper';
import BaseDevice from '../server/devices/BaseDevice';
import Client from '../Client';
import {RocketOutlined} from '@ant-design/icons';
import {showEmulatorLauncher} from '../sandy-chrome/appinspect/LaunchEmulator';

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
  const title = `Opening plugin ${params.pluginId}…`;

  if (!(await verifyLighthouseAndUserLoggedIn(store, title))) {
    return;
  }
  await verifyFlipperIsUpToDate(title);
  if (!(await verifyPluginStatus(store, params.pluginId, title))) {
    return;
  }

  const isDevicePlugin = store
    .getState()
    .plugins.devicePlugins.has(params.pluginId);
  const pluginDefinition = isDevicePlugin
    ? store.getState().plugins.devicePlugins.get(params.pluginId)!
    : store.getState().plugins.clientPlugins.get(params.pluginId)!;
  const deviceOrClient = await selectDevicesAndClient(
    store,
    params,
    title,
    isDevicePlugin,
  );
  if (deviceOrClient === false) {
    return;
  }
  const client: Client | undefined = isDevicePlugin
    ? undefined
    : (deviceOrClient as Client);
  const device: BaseDevice = isDevicePlugin
    ? (deviceOrClient as BaseDevice)
    : (deviceOrClient as Client).deviceSync;

  // verify plugin supported by selected device / client
  if (isDevicePlugin && !device.supportsPlugin(pluginDefinition)) {
    await Dialog.alert({
      title,
      type: 'error',
      message: `This plugin is not supported by device ${device.displayTitle()}`,
    });
    return;
  }
  if (!isDevicePlugin && !client!.plugins.has(params.pluginId)) {
    await Dialog.alert({
      title,
      type: 'error',
      message: `This plugin is not supported by client ${client!.query.app}`,
    });
  }

  // verify plugin enabled
  if (isDevicePlugin) {
    // for the device plugins enabling is a bit more complication and should go through the pluginManager
    if (
      !store.getState().connections.enabledDevicePlugins.has(params.pluginId)
    ) {
      store.dispatch(switchPlugin({plugin: pluginDefinition}));
    }
  } else {
    store.dispatch(setPluginEnabled(params.pluginId, client!.query.app));
  }

  // open the plugin
  if (isDevicePlugin) {
    store.dispatch(
      selectPlugin({
        selectedPlugin: params.pluginId,
        selectedApp: null,
        selectedDevice: device,
        deepLinkPayload: params.payload,
      }),
    );
  } else {
    store.dispatch(
      selectPlugin({
        selectedPlugin: params.pluginId,
        selectedApp: client!.query.app,
        selectedDevice: device,
        deepLinkPayload: params.payload,
      }),
    );
  }
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

async function selectDevicesAndClient(
  store: Store,
  params: OpenPluginParams,
  title: string,
  isDevicePlugin: boolean,
): Promise<false | BaseDevice | Client> {
  function findValidDevices() {
    // find connected devices with the right OS.
    return store
      .getState()
      .connections.devices.filter((d) => d.connected.get())
      .filter(
        (d) => params.devices.length === 0 || params.devices.includes(d.os),
      );
  }

  // loop until we have devices (or abort)
  while (!findValidDevices().length) {
    if (!(await launchDeviceDialog(store, params, title))) {
      return false;
    }
  }

  // at this point we have 1 or more valid devices
  const availableDevices = findValidDevices();
  // device plugin
  if (isDevicePlugin) {
    if (availableDevices.length === 1) {
      return availableDevices[0];
    }
    return (await selectDeviceDialog(availableDevices, title)) ?? false;
  }

  // wait for valid client
  while (true) {
    const validClients = store
      .getState()
      .connections.clients.filter(
        // correct app name, or, if not set, an app that at least supports this plugin
        (c) =>
          params.client
            ? c.query.app === params.client
            : c.plugins.has(params.pluginId),
      )
      .filter((c) => c.connected.get())
      .filter((c) => availableDevices.includes(c.deviceSync));

    if (validClients.length === 1) {
      return validClients[0];
    }
    if (validClients.length > 1) {
      return (await selectClientDialog(validClients, title)) ?? false;
    }

    // no valid client yet
    const result = await new Promise<boolean>((resolve) => {
      const dialog = Dialog.alert({
        title,
        type: 'warning',
        message: params.client
          ? `Application '${params.client}' doesn't seem to be connected yet. Please start a debug version of the app to continue.`
          : `No application that supports plugin '${params.pluginId}' seems to be running. Please start a debug application that supports the plugin to continue.`,
        okText: 'Cancel',
      });
      // eslint-disable-next-line promise/catch-or-return
      dialog.then(() => resolve(false));

      const origClients = store.getState().connections.clients;
      // eslint-disable-next-line promise/catch-or-return
      waitFor(store, (state) => state.connections.clients !== origClients).then(
        () => {
          dialog.close();
          resolve(true);
        },
      );
    });

    if (!result) {
      return false; // User cancelled
    }
  }
}

/**
 * Shows a warning that no device was found, with button to launch emulator.
 * Resolves false if cancelled, or true if new devices were detected.
 */
async function launchDeviceDialog(
  store: Store,
  params: OpenPluginParams,
  title: string,
) {
  return new Promise<boolean>((resolve) => {
    const currentDevices = store.getState().connections.devices;
    const waitForNewDevice = async () =>
      await waitFor(
        store,
        (state) => state.connections.devices !== currentDevices,
      );
    const dialog = Dialog.confirm({
      title,
      message: (
        <p>
          To open the current deeplink for plugin {params.pluginId} a device{' '}
          {params.devices.length ? ' of type ' + params.devices.join(', ') : ''}{' '}
          should be up and running. No device was found. Please connect a device
          or launch an emulator / simulator.
        </p>
      ),
      cancelText: 'Cancel',
      okText: 'Launch Device',
      onConfirm: async () => {
        showEmulatorLauncher(store);
        await waitForNewDevice();
        return true;
      },
      okButtonProps: {
        icon: <RocketOutlined />,
      },
    });
    // eslint-disable-next-line promise/catch-or-return
    dialog.then(() => {
      // dialog was cancelled
      resolve(false);
    });

    // new devices were found
    // eslint-disable-next-line promise/catch-or-return
    waitForNewDevice().then(() => {
      dialog.close();
      resolve(true);
    });
  });
}

async function selectDeviceDialog(
  devices: BaseDevice[],
  title: string,
): Promise<undefined | BaseDevice> {
  const selectedId = await Dialog.options({
    title,
    message: 'Select the device to open:',
    options: devices.map((d) => ({
      value: d.serial,
      label: d.displayTitle(),
    })),
  });
  // might find nothing if id === false
  return devices.find((d) => d.serial === selectedId);
}

async function selectClientDialog(
  clients: Client[],
  title: string,
): Promise<undefined | Client> {
  const selectedId = await Dialog.options({
    title,
    message:
      'Multiple applications running this plugin were found, please select one:',
    options: clients.map((c) => ({
      value: c.id,
      label: `${c.query.app} on ${c.deviceSync.displayTitle()}`,
    })),
  });
  // might find nothing if id === false
  return clients.find((c) => c.id === selectedId);
}
