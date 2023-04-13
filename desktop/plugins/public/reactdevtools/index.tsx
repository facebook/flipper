/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {createRoot, Root} from 'react-dom/client';
import {
  Layout,
  usePlugin,
  DevicePluginClient,
  createState,
  useValue,
  Toolbar,
} from 'flipper-plugin';
import React from 'react';
import {Button, message, Switch, Typography} from 'antd';
// @ts-expect-error
import * as ReactDevToolsOSS from 'react-devtools-inline/frontend';
import {DevToolsEmbedder} from './DevToolsEmbedder';
import {Events, Methods} from './contract';

const DEV_TOOLS_NODE_ID = 'reactdevtools-out-of-react-node';
const CONNECTED = 'DevTools connected';

enum ConnectionStatus {
  None = 'None',
  Initializing = 'Initializing...',
  WaitingForReload = 'Waiting for connection from device...',
  WaitingForMetroReload = 'Waiting for Metro to reload...',
  Connected = 'Connected',
  Error = 'Error',
}

type DevToolsInstanceType = 'global' | 'oss';
type DevToolsInstance = {
  type: DevToolsInstanceType;
  module: any;
};

export function devicePlugin(client: DevicePluginClient<Events, Methods>) {
  const metroDevice = client.device;

  const statusMessage = createState('Empty');
  const connectionStatus = createState<ConnectionStatus>(ConnectionStatus.None);
  const initialized = createState(false);

  const globalDevToolsAvailable = createState(false);
  let globalDevToolsInstance: DevToolsInstance | undefined;

  let devToolsInstance: DevToolsInstance | undefined;
  const selectedDevToolsInstanceType = createState<DevToolsInstanceType>(
    'oss',
    {
      persist: 'selectedDevToolsInstanceType',
      persistToLocalStorage: true,
    },
  );

  let root: Root | undefined;

  let pollHandle: NodeJS.Timeout | undefined = undefined;

  let metroReloadAttempts = 0;

  async function maybeGetInitialGlobalDevTools(): Promise<DevToolsInstance> {
    console.debug(
      'flipper-plugin-react-devtools.maybeGetInitialGlobalDevTools',
    );
    try {
      const newGlobalDevToolsSource = await client.sendToServerAddOn(
        'globalDevTools',
      );

      if (newGlobalDevToolsSource) {
        globalDevToolsInstance = {
          type: 'global',
          // https://esbuild.github.io/content-types/#direct-eval
          // eslint-disable-next-line no-eval
          module: (0, eval)(newGlobalDevToolsSource),
        };

        globalDevToolsAvailable.set(true);
      }
    } catch (e) {
      console.error(
        'flipper-plugin-react-devtools.maybeGetInitialGlobalDevTools -> failed to load global devtools',
        e,
      );
    }

    if (
      selectedDevToolsInstanceType.get() === 'global' &&
      globalDevToolsInstance
    ) {
      console.debug(
        'flipper-plugin-react-devtools.maybeGetInitialGlobalDevTools -> using global devtools',
      );
      return globalDevToolsInstance;
    }

    selectedDevToolsInstanceType.set('oss'); // disable in case it was enabled
    console.debug(
      'flipper-plugin-react-devtools.maybeGetInitialGlobalDevTools -> using OSS devtools',
    );
    return {type: 'oss', module: ReactDevToolsOSS};
  }

  function getDevToolsInstance(
    instanceType: DevToolsInstanceType,
  ): DevToolsInstance {
    let module;
    switch (instanceType) {
      case 'global':
        module = globalDevToolsInstance!.module;
        break;
      case 'oss':
        module = ReactDevToolsOSS;
        break;
    }
    return {
      type: instanceType,
      module,
    };
  }

  async function toggleUseGlobalDevTools() {
    if (!globalDevToolsInstance) {
      message.warn(
        "No globally installed react-devtools package found. Run 'npm install -g react-devtools'.",
      );
      return;
    }

    selectedDevToolsInstanceType.update((prev: DevToolsInstanceType) => {
      devToolsInstance = getDevToolsInstance(
        prev === 'global' ? 'oss' : 'global',
      );
      return devToolsInstance.type;
    });

    await rebootDevTools();
  }

  async function rebootDevTools() {
    metroReloadAttempts = 0;
    setStatus(ConnectionStatus.None, 'Loading DevTools...');
    // clean old instance
    if (pollHandle) {
      clearTimeout(pollHandle);
    }
    const devToolsNode = document.getElementById(DEV_TOOLS_NODE_ID);
    if (!devToolsNode) {
      setStatus(ConnectionStatus.Error, 'Failed to find target DOM Node');
      return;
    }
    if (root) {
      root.unmount();
    }
    await bootDevTools();
  }

  async function bootDevTools() {
    if (connectionStatus.get() !== ConnectionStatus.None) {
      return;
    }

    if (!initialized.get()) {
      console.debug(
        'flipper-plugin-react-devtools -> waiting for initialization',
      );
      await new Promise<void>((resolve) =>
        initialized.subscribe((newInitialized) => {
          if (newInitialized) {
            resolve();
          }
        }),
      );
    }

    const devToolsNode = document.getElementById(DEV_TOOLS_NODE_ID);
    if (!devToolsNode) {
      setStatus(ConnectionStatus.Error, 'Failed to find target DOM Node');
      return;
    }

    if (devtoolsHaveStarted()) {
      setStatus(ConnectionStatus.Connected, CONNECTED);
      return;
    }

    // They're new!
    try {
      console.debug('flipper-plugin-react-devtools -> waiting for device');
      setStatus(ConnectionStatus.Initializing, 'Waiting for device...');
      client.onServerAddOnMessage('connected', () => {
        if (pollHandle) {
          clearTimeout(pollHandle);
        }

        console.debug('flipper-plugin-react-devtools -> device found');
        setStatus(
          ConnectionStatus.Initializing,
          'Device found. Initializing frontend...',
        );

        const wall = {
          listen(listener: any) {
            client.onServerAddOnMessage('message', (data) => {
              console.debug(
                'flipper-plugin-react-devtools.onServerAddOnMessage',
                data,
              );
              listener(data);
            });
          },
          send(event: any, payload: any) {
            const data = {event, payload};
            client.sendToServerAddOn('message', data).catch((e) => {
              console.warn(`Failed to send message to React devtools`, e);
            });
          },
        };

        const bridge = devToolsInstance!.module.createBridge(window, wall);
        const store = devToolsInstance!.module.createStore(bridge);

        const DevTools = devToolsInstance!.module.initialize(window, {
          bridge,
          store,
        });

        root = createRoot(devToolsNode);
        root.render(
          React.createElement(DevTools, {
            showTabBar: true,
            hideViewSourceAction: true,
            hideLogAction: true,
          }),
        );

        console.debug('flipper-plugin-react-devtools -> connected');
        setStatus(ConnectionStatus.Connected, 'Connected');
      });

      startPollForConnection();
    } catch (e) {
      console.error('Failed to initalize React DevTools' + e);
      setStatus(ConnectionStatus.Error, 'Failed to initialize DevTools: ' + e);
    }
  }

  function setStatus(cs: ConnectionStatus, status: string) {
    connectionStatus.set(cs);
    if (status.startsWith('The server is listening on')) {
      statusMessage.set(status + ' Waiting for connection...');
    } else {
      statusMessage.set(status);
    }
  }

  function startPollForConnection(delay = 3000) {
    pollHandle = setTimeout(async () => {
      switch (true) {
        // Found DevTools!
        case devtoolsHaveStarted():
          setStatus(ConnectionStatus.Connected, CONNECTED);
          return;
        // Waiting for connection, but we do have an active Metro connection, lets force a reload to enter Dev Mode on app
        // prettier-ignore
        case connectionStatus.get() === ConnectionStatus.Initializing: {
          if (metroDevice) {
            const nextConnectionStatus = metroReloadAttempts === 0 ? ConnectionStatus.Initializing : ConnectionStatus.WaitingForMetroReload;
            metroReloadAttempts++;
            setStatus(
              nextConnectionStatus,
              "Sending 'reload' to Metro to force DevTools to connect...",
            );
            metroDevice.sendMetroCommand('reload');
            startPollForConnection(3000);
            return;
          }

          // Waiting for initial connection, but no WS bridge available
          setStatus(
            ConnectionStatus.WaitingForReload,
            "DevTools is unable to connect yet. Please trigger the DevMenu in the RN app, or reload it to connect.",
          );
          startPollForConnection(10000);
          return;
        }
        // Still nothing? Users might not have done manual action, or some other tools have picked it up?
        case connectionStatus.get() === ConnectionStatus.WaitingForReload:
        case connectionStatus.get() === ConnectionStatus.WaitingForMetroReload:
          setStatus(
            ConnectionStatus.WaitingForReload,
            'DevTools is unable to connect yet. Check for other instances, trigger the DevMenu in the RN app, or reload it to connect.',
          );
          startPollForConnection();
          return;
      }
    }, delay);
  }

  function devtoolsHaveStarted() {
    return (
      (document.getElementById(DEV_TOOLS_NODE_ID)?.childElementCount ?? 0) > 0
    );
  }

  client.onReady(() => {
    client.onServerAddOnStart(async () => {
      devToolsInstance = await maybeGetInitialGlobalDevTools();
      initialized.set(true);
    });
  });

  client.onActivate(() => {
    client.onServerAddOnStart(async () => {
      bootDevTools();
    });
  });

  client.onDeactivate(() => {
    if (pollHandle) {
      clearTimeout(pollHandle);
    }
  });

  return {
    devtoolsHaveStarted,
    connectionStatus,
    statusMessage,
    bootDevTools,
    rebootDevTools,
    metroDevice,
    globalDevToolsAvailable,
    selectedDevToolsInstanceType,
    toggleUseGlobalDevTools,
    initialized,
  };
}

export function Component() {
  const instance = usePlugin(devicePlugin);
  const globalDevToolsAvailable = useValue(instance.globalDevToolsAvailable);
  const connectionStatus = useValue(instance.connectionStatus);

  const displayToolbar =
    globalDevToolsAvailable || connectionStatus !== ConnectionStatus.Connected;

  return (
    <>
      <DevToolsInstanceToolbar />
      <DevToolsEmbedder
        offset={displayToolbar ? 40 : 0}
        nodeId={DEV_TOOLS_NODE_ID}
      />
    </>
  );
}

function DevToolsInstanceToolbar() {
  const instance = usePlugin(devicePlugin);
  const globalDevToolsAvailable = useValue(instance.globalDevToolsAvailable);
  const connectionStatus = useValue(instance.connectionStatus);
  const statusMessage = useValue(instance.statusMessage);
  const selectedDevToolsInstanceType = useValue(
    instance.selectedDevToolsInstanceType,
  );
  const initialized = useValue(instance.initialized);

  const selectionControl = globalDevToolsAvailable ? (
    <>
      <Switch
        checked={selectedDevToolsInstanceType === 'global'}
        onChange={instance.toggleUseGlobalDevTools}
        size="small"
        disabled={!initialized}
      />
      Use globally installed DevTools
    </>
  ) : null;

  return (
    <Layout.Container grow>
      <Toolbar right={selectionControl} wash>
        <Typography.Text type="secondary">{statusMessage}</Typography.Text>
        {connectionStatus === ConnectionStatus.WaitingForReload ||
        connectionStatus === ConnectionStatus.WaitingForMetroReload ||
        connectionStatus === ConnectionStatus.Error ? (
          <Button
            size="small"
            onClick={() => {
              instance.metroDevice?.sendMetroCommand('reload');
              instance.rebootDevTools();
            }}>
            Retry
          </Button>
        ) : null}
      </Toolbar>
    </Layout.Container>
  );
}
