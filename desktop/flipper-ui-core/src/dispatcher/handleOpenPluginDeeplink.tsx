/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Dialog, getFlipperLib} from 'flipper-plugin';
import {isTest, UserNotSignedInError} from 'flipper-common';
import {getUser} from '../fb-stubs/user';
import {State, Store} from '../reducers/index';
import {checkForUpdate} from '../fb-stubs/checkForUpdate';
import {getAppVersion} from '../utils/info';
import {
  canBeDefaultDevice,
  getAllClients,
  selectPlugin,
  setPluginEnabled,
} from '../reducers/connections';
import {getUpdateAvailableMessage} from '../chrome/UpdateIndicator';
import {Typography} from 'antd';
import {getPluginStatus, PluginStatus} from '../utils/pluginUtils';
import {loadPluginsFromMarketplace} from './pluginMarketplace';
import {switchPlugin} from '../reducers/pluginManager';
import {startPluginDownload} from '../reducers/pluginDownloads';
import isProduction from '../utils/isProduction';
import {BaseDevice, getRenderHostInstance} from 'flipper-frontend-core';
import Client from '../Client';
import {RocketOutlined} from '@ant-design/icons';
import {showEmulatorLauncher} from '../sandy-chrome/appinspect/LaunchEmulator';
import {showLoginDialog} from '../chrome/fb-stubs/SignInSheet';
import {
  DeeplinkInteraction,
  DeeplinkInteractionState,
  OpenPluginParams,
} from '../deeplinkTracking';
import {waitFor} from '../utils/waitFor';

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

export async function handleOpenPluginDeeplink(
  store: Store,
  query: string,
  trackInteraction: (interaction: DeeplinkInteraction) => void,
) {
  const params = parseOpenPluginParams(query);
  const title = `Opening plugin ${params.pluginId}…`;
  console.debug(`[deeplink] ${title} for with params`, params);

  if (!(await verifyLighthouseAndUserLoggedIn(store, title))) {
    trackInteraction({
      state: 'PLUGIN_LIGHTHOUSE_BAIL',
      plugin: params,
    });
    return;
  }
  console.debug('[deeplink] Cleared Lighthouse and log-in check.');
  await verifyFlipperIsUpToDate(title);
  console.debug('[deeplink] Cleared up-to-date check.');
  const [pluginStatusResult, pluginStatus] = await verifyPluginStatus(
    store,
    params.pluginId,
    title,
  );
  if (!pluginStatusResult) {
    trackInteraction({
      state: 'PLUGIN_STATUS_BAIL',
      plugin: params,
      extra: {pluginStatus},
    });
    return;
  }
  console.debug('[deeplink] Cleared plugin status check:', pluginStatusResult);

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
  console.debug(
    '[deeplink] Selected device and client:',
    deviceOrClient instanceof BaseDevice
      ? deviceOrClient.description
      : deviceOrClient instanceof Client
      ? deviceOrClient.query
      : deviceOrClient,
  );
  if ('errorState' in deviceOrClient) {
    trackInteraction({
      state: deviceOrClient.errorState,
      plugin: params,
    });
    return;
  }
  const client: Client | undefined = isDevicePlugin
    ? undefined
    : (deviceOrClient as Client);
  const device: BaseDevice = isDevicePlugin
    ? (deviceOrClient as BaseDevice)
    : (deviceOrClient as Client).device;
  console.debug('[deeplink] Client: ', client?.query);
  console.debug('[deeplink] Device: ', device?.description);

  // verify plugin supported by selected device / client
  if (isDevicePlugin && !device.supportsPlugin(pluginDefinition)) {
    await Dialog.alert({
      title,
      type: 'error',
      message: `This plugin is not supported by device ${device.displayTitle()}`,
    });
    trackInteraction({
      state: 'PLUGIN_DEVICE_UNSUPPORTED',
      plugin: params,
      extra: {device: device.displayTitle()},
    });
    return;
  }
  console.debug('[deeplink] Cleared device plugin support check.');

  console.debug(
    '[deeplink] Waiting for client initialization',
    client?.id,
    client?.initializationPromise,
  );

  await client?.initializationPromise;

  console.debug('[deeplink] Client initialized ', client?.id);

  if (!isDevicePlugin && !client!.plugins.has(params.pluginId)) {
    await Dialog.alert({
      title,
      type: 'error',
      message: `This plugin is not supported by client ${client!.query.app}`,
    });
    trackInteraction({
      state: 'PLUGIN_CLIENT_UNSUPPORTED',
      plugin: params,
      extra: {client: client!.query.app},
    });
    return;
  }
  console.debug('[deeplink] Cleared client plugin support check.');

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
  console.debug('[deeplink] Cleared plugin enabling.');

  // open the plugin
  if (isDevicePlugin) {
    store.dispatch(
      selectPlugin({
        selectedPlugin: params.pluginId,
        selectedAppId: null,
        selectedDevice: device,
        deepLinkPayload: params.payload,
      }),
    );
  } else {
    store.dispatch(
      selectPlugin({
        selectedPlugin: params.pluginId,
        selectedAppId: client!.id,
        selectedDevice: device,
        deepLinkPayload: params.payload,
      }),
    );
  }
  trackInteraction({
    state: 'PLUGIN_OPEN_SUCCESS',
    plugin: params,
  });
}

// check if user is connected to VPN and logged in. Returns true if OK, or false if aborted
async function verifyLighthouseAndUserLoggedIn(
  store: Store,
  title: string,
): Promise<boolean> {
  if (
    !getFlipperLib().isFB ||
    getRenderHostInstance().serverConfig.env.NODE_ENV === 'test'
  ) {
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

  await showLoginDialog();
  // wait until login succeeded
  await waitForLogin(store);
  return true;
}

async function waitForLogin(store: Store) {
  return waitFor(store, (state) => !!state.user?.id);
}

async function verifyFlipperIsUpToDate(title: string) {
  const config = getRenderHostInstance().serverConfig.processConfig;
  if (
    !isProduction() ||
    isTest() ||
    !config.updaterEnabled ||
    config.suppressPluginUpdateNotifications
  ) {
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
): Promise<[boolean, PluginStatus]> {
  await waitFor(store, (state) => state.plugins.initialized);
  // make sure we have marketplace plugin data present
  if (!isTest() && !store.getState().plugins.marketplacePlugins.length) {
    // plugins not yet fetched
    // updates plugins from marketplace (if logged in), and stores them
    await loadPluginsFromMarketplace(store);
  }
  // while true loop; after pressing install or add GK, we want to check again if plugin is available
  while (true) {
    const [status, reason] = getPluginStatus(store, pluginId);
    switch (status) {
      case 'ready':
        return [true, status];
      case 'unknown':
        await Dialog.alert({
          type: 'warning',
          title,
          message: `No plugin with id '${pluginId}' is known to Flipper. Please correct the deeplink, or install the plugin from NPM using the plugin manager.`,
        });
        return [false, status];
      case 'failed':
        await Dialog.alert({
          type: 'error',
          title,
          message: `We found plugin '${pluginId}', but failed to load it: ${reason}. Please check the logs for more details`,
        });
        return [false, status];
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
              getRenderHostInstance().restartFlipper();
              // intentionally forever pending, we're restarting...
              return new Promise(() => {});
            },
          }))
        ) {
          return [false, status];
        }
        break;
      case 'marketplace_installable': {
        if (!(await installMarketPlacePlugin(store, pluginId, title))) {
          return [false, status];
        }
        break;
      }
      default:
        throw new Error('Unhandled state: ' + status);
    }
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

type DeeplinkError = {
  errorState: DeeplinkInteractionState;
};

async function selectDevicesAndClient(
  store: Store,
  params: OpenPluginParams,
  title: string,
  isDevicePlugin: boolean,
): Promise<DeeplinkError | BaseDevice | Client> {
  function findValidDevices() {
    // find connected devices with the right OS.
    return (
      store
        .getState()
        .connections.devices.filter((d) => d.connected.get())
        .filter(
          (d) => params.devices.length === 0 || params.devices.includes(d.os),
        )
        // This filters out OS-level devices which are causing more confusion than good
        // when used with deeplinks.
        .filter(canBeDefaultDevice)
    );
  }

  // loop until we have devices (or abort)
  while (!findValidDevices().length) {
    if (!(await launchDeviceDialog(store, params, title))) {
      return {errorState: 'PLUGIN_DEVICE_BAIL'};
    }
  }

  // at this point we have 1 or more valid devices
  const availableDevices = findValidDevices();
  console.debug(
    '[deeplink] selectDevicesAndClient found at least one more valid device:',
    availableDevices.map((d) => d.description),
  );
  // device plugin
  if (isDevicePlugin) {
    if (availableDevices.length === 1) {
      return availableDevices[0];
    }
    const selectedDevice = await selectDeviceDialog(availableDevices, title);
    if (!selectedDevice) {
      return {errorState: 'PLUGIN_DEVICE_SELECTION_BAIL'};
    }
    return selectedDevice;
  }

  console.debug(
    '[deeplink] Not a device plugin. Waiting for valid client. current clients',
    store.getState().connections.clients,
  );
  return await waitForClient(store, availableDevices, params, title);
}

async function waitForClient(
  store: Store,
  availableDevices: BaseDevice[],
  params: OpenPluginParams,
  title: string,
): Promise<Client | DeeplinkError> {
  const response = await tryGetClient(
    store.getState(),
    availableDevices,
    params,
    title,
  );

  if (response != null) {
    return response;
  }

  const dialog = Dialog.alert({
    title,
    type: 'warning',
    message: params.client
      ? `Application '${params.client}' doesn't seem to be connected yet. Please start a debug version of the app to continue.`
      : `No application that supports plugin '${params.pluginId}' seems to be running. Please start a debug application that supports the plugin to continue.`,
    okText: 'Cancel',
  });

  const userCancelled: Promise<DeeplinkError> = dialog.then(() => ({
    errorState: 'PLUGIN_CLIENT_BAIL',
  }));

  let unsubStore: () => void;
  const clientFound = new Promise<Client | DeeplinkError>(async (resolve) => {
    unsubStore = store.subscribe(async () => {
      const state = store.getState();
      const client = await tryGetClient(state, availableDevices, params, title);
      if (client != null) {
        resolve(client);
      }
    });
  });

  return await Promise.race([userCancelled, clientFound]).finally(() => {
    console.log('[deeplink] finally cleanup', {clientFound, dialog});
    dialog.close();
    unsubStore();
  });
}

async function tryGetClient(
  state: State,
  availableDevices: BaseDevice[],
  params: OpenPluginParams,
  title: string,
): Promise<null | DeeplinkError | Client> {
  const validClients = getAllClients(state.connections)
    .filter(
      // correct app name, or, if not set, an app that at least supports this plugin
      (c) =>
        params.client
          ? c.query.app === params.client
          : c.plugins.has(params.pluginId),
    )
    .filter((c) => c.connected.get())
    .filter((c) =>
      availableDevices.map((d) => d.serial).includes(c.device.serial),
    );

  if (validClients.length === 1) {
    return validClients[0];
  }
  if (validClients.length > 1) {
    const selectedClient = await selectClientDialog(validClients, title);
    if (!selectedClient) {
      return {errorState: 'PLUGIN_CLIENT_SELECTION_BAIL'};
    }
    return selectedClient;
  }

  console.debug(`[deeplink] Did not find client`, {
    clients: getAllClients(state.connections),
    params,
    availableDevices,
  });
  return null;
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
      label: `${c.query.app} on ${c.device.displayTitle()}`,
    })),
  });
  // might find nothing if id === false
  return clients.find((c) => c.id === selectedId);
}
