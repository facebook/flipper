/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import ReactDevToolsStandaloneEmbedded from 'react-devtools-core/standalone';
import {
  Layout,
  usePlugin,
  DevicePluginClient,
  createState,
  useValue,
  sleep,
  Toolbar,
} from 'flipper-plugin';
import React from 'react';
import getPort from 'get-port';
import {Button, Switch, Typography} from 'antd';
import child_process from 'child_process';
import fs from 'fs';
import path from 'path';
import {DevToolsEmbedder} from './DevToolsEmbedder';

const DEV_TOOLS_NODE_ID = 'reactdevtools-out-of-react-node';
const CONNECTED = 'DevTools connected';
const DEV_TOOLS_PORT = 8097; // hardcoded in RN

interface MetroDevice {
  ws?: WebSocket;
  sendCommand(command: string, params?: any): void;
}

function findGlobalDevTools(): Promise<string | undefined> {
  return new Promise((resolve) => {
    child_process.exec('npm root -g', (error, basePath) => {
      if (error) {
        console.warn(
          'Failed to find globally installed React DevTools: ' + error,
        );
        resolve(undefined);
      } else {
        const devToolsPath = path.join(
          basePath.trim(),
          'react-devtools',
          'node_modules',
          'react-devtools-core',
        );
        fs.stat(devToolsPath, (err, stats) => {
          resolve(!err && stats ? devToolsPath : undefined);
        });
      }
    });
  });
}

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
  const globalDevToolsPath = createState<string>();
  const useGlobalDevTools = createState(false); // TODO: store in local storage T69989583
  let devToolsInstance: typeof ReactDevToolsStandaloneEmbedded =
    ReactDevToolsStandaloneEmbedded;
  let startResult: {close(): void} | undefined = undefined;

  let pollHandle: NodeJS.Timeout | undefined = undefined;

  async function toggleUseGlobalDevTools() {
    if (!globalDevToolsPath.get()) {
      return;
    }
    useGlobalDevTools.update((v) => !v);

    // Load right library
    if (useGlobalDevTools.get()) {
      console.log('Loading ' + globalDevToolsPath.get());
      devToolsInstance = global.electronRequire(
        globalDevToolsPath.get()!,
      ).default;
    } else {
      devToolsInstance = ReactDevToolsStandaloneEmbedded;
    }

    statusMessage.set('Switching devTools');
    connectionStatus.set(ConnectionStatus.Initializing);
    // clean old instance
    if (pollHandle) {
      clearTimeout(pollHandle);
    }
    startResult?.close();
    await sleep(1000); // wait for port to close
    startResult = undefined;
    await bootDevTools();
  }

  async function bootDevTools() {
    const devToolsNode = document.getElementById(DEV_TOOLS_NODE_ID);
    if (!devToolsNode) {
      setStatus(ConnectionStatus.Error, 'Failed to find target DOM Node');
      return;
    }

    // React DevTools were initilized before
    if (startResult) {
      if (devtoolsHaveStarted()) {
        setStatus(ConnectionStatus.Connected, CONNECTED);
      } else {
        startPollForConnection();
      }
      return;
    }

    // They're new!
    try {
      setStatus(
        ConnectionStatus.Initializing,
        'Waiting for port ' + DEV_TOOLS_PORT,
      );
      const port = await getPort({port: DEV_TOOLS_PORT}); // default port for dev tools
      if (port !== DEV_TOOLS_PORT) {
        setStatus(
          ConnectionStatus.Error,
          `Port ${DEV_TOOLS_PORT} is already taken`,
        );
        return;
      }
      setStatus(
        ConnectionStatus.Initializing,
        'Starting DevTools server on ' + port,
      );
      startResult = devToolsInstance
        .setContentDOMNode(devToolsNode)
        .setStatusListener((status) => {
          // TODO: since devToolsInstance is an instance, we are probably leaking memory here
          setStatus(ConnectionStatus.Initializing, status);
        })
        .startServer(port) as any;
      setStatus(ConnectionStatus.Initializing, 'Waiting for device');
    } catch (e) {
      console.error('Failed to initalize React DevTools' + e);
      setStatus(ConnectionStatus.Error, 'Failed to initialize DevTools: ' + e);
    }

    setStatus(
      ConnectionStatus.Initializing,
      'DevTools have been initialized, waiting for connection...',
    );
    if (devtoolsHaveStarted()) {
      setStatus(ConnectionStatus.Connected, CONNECTED);
    } else {
      startPollForConnection();
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
            "The DevTools didn't connect yet. Please trigger the DevMenu in the React Native app, or Reload it to connect.",
          );
          startPollForConnection(10000);
          return;
        // Still nothing? Users might not have done manual action, or some other tools have picked it up?
        case connectionStatus.get() === ConnectionStatus.WaitingForReload:
          setStatus(
            ConnectionStatus.WaitingForReload,
            "The DevTools didn't connect yet. Check if no other instances are running.",
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
    findGlobalDevTools().then((path) => {
      globalDevToolsPath.set(path + '/standalone');
      if (path) {
        console.log('Found global React DevTools: ', path);
      }
    });
  });

  client.onDestroy(() => {
    startResult?.close();
  });

  client.onActivate(() => {
    bootDevTools();
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
    metroDevice,
    globalDevToolsPath,
    useGlobalDevTools,
    toggleUseGlobalDevTools,
  };
}

export function Component() {
  const instance = usePlugin(devicePlugin);
  const connectionStatus = useValue(instance.connectionStatus);
  const statusMessage = useValue(instance.statusMessage);
  const globalDevToolsPath = useValue(instance.globalDevToolsPath);
  const useGlobalDevTools = useValue(instance.useGlobalDevTools);

  return (
    <Layout.Container grow>
      {globalDevToolsPath ? (
        <Toolbar
          right={
            <>
              <Switch
                checked={useGlobalDevTools}
                onChange={instance.toggleUseGlobalDevTools}
                size="small"
              />
              Use globally installed DevTools
            </>
          }
          wash>
          {connectionStatus !== ConnectionStatus.Connected ? (
            <Typography.Text type="secondary">{statusMessage}</Typography.Text>
          ) : null}
          {(connectionStatus === ConnectionStatus.WaitingForReload &&
            instance.metroDevice?.ws) ||
          connectionStatus === ConnectionStatus.Error ? (
            <Button
              size="small"
              onClick={() => {
                instance.metroDevice?.sendCommand('reload');
                instance.bootDevTools();
              }}>
              Retry
            </Button>
          ) : null}
        </Toolbar>
      ) : null}
      <DevToolsEmbedder offset={40} nodeId={DEV_TOOLS_NODE_ID} />
    </Layout.Container>
  );
}
