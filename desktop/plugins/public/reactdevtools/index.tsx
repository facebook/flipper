/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import ReactDevToolsStandalone from 'react-devtools-core/standalone';
import {
  Layout,
  usePlugin,
  DevicePluginClient,
  createState,
  useValue,
  theme,
  sleep,
} from 'flipper-plugin';
import React, {createRef, useEffect} from 'react';
import getPort from 'get-port';
import {Alert, Button} from 'antd';

const DEV_TOOLS_NODE_ID = 'reactdevtools-out-of-react-node';

interface MetroDevice {
  ws?: WebSocket;
  sendCommand(command: string, params?: any): void;
}

function createDevToolsNode(): HTMLElement {
  const div = document.createElement('div');
  div.id = DEV_TOOLS_NODE_ID;
  div.style.display = 'none';
  div.style.width = '100%';
  div.style.height = '100%';
  div.style.flex = '1 1 0%';
  div.style.justifyContent = 'center';
  div.style.alignItems = 'stretch';

  document.body && document.body.appendChild(div);

  return div;
}

function findDevToolsNode(): HTMLElement | null {
  return document.querySelector('#' + DEV_TOOLS_NODE_ID);
}

function attachDevTools(target: Element | Text, devToolsNode: HTMLElement) {
  target.appendChild(devToolsNode);
  devToolsNode.style.display = 'flex';
}

function detachDevTools(devToolsNode: HTMLElement) {
  devToolsNode.style.display = 'none';
  document.body && document.body.appendChild(devToolsNode);
}

const CONNECTED = 'DevTools connected';
const SUPPORTED_OCULUS_DEVICE_TYPES = ['quest', 'go', 'pacific'];

enum ConnectionStatus {
  Initializing = 'Initializing...',
  WaitingForReload = 'Waiting for connection from device...',
  Connected = 'Connected',
  Error = 'Error',
}

export function devicePlugin(client: DevicePluginClient) {
  const metroDevice: MetroDevice = client.device.realDevice;
  if (!metroDevice.sendCommand || !('ws' in metroDevice)) {
    throw new Error('Invalid metroDevice');
  }

  const statusMessage = createState('initializing');
  const connectionStatus = createState<ConnectionStatus>(
    ConnectionStatus.Initializing,
  );

  const containerRef = createRef<HTMLDivElement>();
  let pollHandle: NodeJS.Timeout | undefined = undefined;
  let isMounted = false;

  async function bootDevTools() {
    isMounted = true;
    let devToolsNode = findDevToolsNode();
    if (!devToolsNode) {
      devToolsNode = createDevToolsNode();
    }
    attachDevTools(containerRef.current!, devToolsNode);
    initializeDevTools(devToolsNode);
    setStatus(
      ConnectionStatus.Initializing,
      'DevTools have been initialized, waiting for connection...',
    );

    await sleep(5); // give node time to move
    if (devtoolsHaveStarted()) {
      setStatus(ConnectionStatus.Connected, CONNECTED);
    } else {
      startPollForConnection();
    }
  }

  function setStatus(cs: ConnectionStatus, status: string) {
    connectionStatus.set(cs);
    if (!isMounted) {
      return;
    }
    if (status.startsWith('The server is listening on')) {
      statusMessage.set(status + ' Waiting for connection...');
    } else {
      statusMessage.set(status);
    }
  }

  function startPollForConnection(delay = 3000) {
    pollHandle = setTimeout(async () => {
      switch (true) {
        // Closed already, ignore
        case !isMounted:
          return;
        // Found DevTools!
        case devtoolsHaveStarted():
          setStatus(ConnectionStatus.Connected, CONNECTED);
          return;
        // Waiting for connection, but we do have an active Metro connection, lets force a reload to enter Dev Mode on app
        // prettier-ignore
        case connectionStatus.get() === ConnectionStatus.Initializing && !!metroDevice?.ws:
          setStatus(
            ConnectionStatus.WaitingForReload,
            "Sending 'reload' to Metro to force the DevTools to connect...",
          );
          metroDevice!.sendCommand('reload');
          startPollForConnection(2000);
          return;
        // Waiting for initial connection, but no WS bridge available
        case connectionStatus.get() === ConnectionStatus.Initializing:
          setStatus(
            ConnectionStatus.WaitingForReload,
            "The DevTools didn't connect yet. Please trigger the DevMenu in the React Native app, or Reload it to connect",
          );
          startPollForConnection(10000);
          return;
        // Still nothing? Users might not have done manual action, or some other tools have picked it up?
        case connectionStatus.get() === ConnectionStatus.WaitingForReload:
          setStatus(
            ConnectionStatus.WaitingForReload,
            "The DevTools didn't connect yet. Please verify your React Native app is in development mode, and that no other instance of the React DevTools are attached to the app already.",
          );
          startPollForConnection();
          return;
      }
    }, delay);
  }

  function devtoolsHaveStarted() {
    return (findDevToolsNode()?.childElementCount ?? 0) > 0;
  }

  async function initializeDevTools(devToolsNode: HTMLElement) {
    try {
      setStatus(ConnectionStatus.Initializing, 'Waiting for port 8097');
      const port = await getPort({port: 8097}); // default port for dev tools
      setStatus(
        ConnectionStatus.Initializing,
        'Starting DevTools server on ' + port,
      );
      // Currently a new port is negotatiated every time the plugin is opened.
      // This can be potentially optimized by keeping the devTools instance around
      ReactDevToolsStandalone.setContentDOMNode(devToolsNode)
        .setStatusListener((status) => {
          setStatus(ConnectionStatus.Initializing, status);
        })
        .startServer(port);
      setStatus(ConnectionStatus.Initializing, 'Waiting for device');

      // This is a hack that should be cleaned up. Instead of setting up port forwarding
      // for any physical android device, we should introduce a mechanism to detect all connected
      // metro apps, and connect to one of them.
      // Since this is not how we want (or can) reliably detect the device we intend to interact with,
      // leaving this here until we can get a list of connected applications & ports from Metro or Flipper
      (window as any).__SECRET_FLIPPER_STORE_DONT_USE_OR_YOU_WILL_BE_FIRED__
        .getState()
        .connections.devices.forEach((d: any) => {
          if (
            (d.deviceType === 'physical' && d.os === 'Android') ||
            SUPPORTED_OCULUS_DEVICE_TYPES.includes(d.title.toLowerCase())
          ) {
            console.log(
              `[React DevTools] Forwarding port ${port} for device ${d.title}`,
            );
            d.reverse([port]);
          }
        });
    } catch (e) {
      console.error('Failed to initalize React DevTools' + e);
      setStatus(ConnectionStatus.Error, 'Failed to initialize DevTools: ' + e);
    }
  }

  function stopDevtools() {
    isMounted = false;
    if (pollHandle) {
      clearTimeout(pollHandle);
    }
    const devToolsNode = findDevToolsNode();
    if (devToolsNode) {
      detachDevTools(devToolsNode);
    }
  }

  return {
    devtoolsHaveStarted,
    connectionStatus,
    statusMessage,
    bootDevTools,
    metroDevice,
    containerRef,
    stopDevtools,
  };
}

export function Component() {
  const instance = usePlugin(devicePlugin);
  const connectionStatus = useValue(instance.connectionStatus);
  const statusMessage = useValue(instance.statusMessage);

  useEffect(() => {
    instance.bootDevTools();
    return instance.stopDevtools;
  }, [instance]);

  return (
    <Layout.Container grow>
      {!instance.devtoolsHaveStarted() ? (
        <Layout.Container
          style={{width: 400, margin: `${theme.space.large}px auto`}}>
          <Alert message={statusMessage} type="warning" showIcon>
            {(connectionStatus === ConnectionStatus.WaitingForReload &&
              instance.metroDevice?.ws) ||
            connectionStatus === ConnectionStatus.Error ? (
              <Button
                style={{width: 200, margin: '10px auto 0 auto'}}
                onClick={() => {
                  instance.metroDevice?.sendCommand('reload');
                  instance.bootDevTools();
                }}>
                Retry
              </Button>
            ) : null}
          </Alert>
        </Layout.Container>
      ) : null}
      <Layout.Container grow ref={instance.containerRef} />
    </Layout.Container>
  );
}
