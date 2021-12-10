/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import type ReactDevToolsStandaloneType from 'react-devtools-core/standalone';
import {
  Layout,
  usePlugin,
  DevicePluginClient,
  createState,
  useValue,
  sleep,
  Toolbar,
  path,
  getFlipperLib,
} from 'flipper-plugin';
import React from 'react';
import getPort from 'get-port';
import {Button, message, Switch, Typography, Select} from 'antd';
import fs from 'fs/promises';
import {DevToolsEmbedder} from './DevToolsEmbedder';
import {getInternalDevToolsModule} from './fb-stubs/getInternalDevToolsModule';

const DEV_TOOLS_NODE_ID = 'reactdevtools-out-of-react-node';
const CONNECTED = 'DevTools connected';
const DEV_TOOLS_PORT = 8097; // hardcoded in RN

async function findGlobalDevTools(): Promise<string | undefined> {
  try {
    const {stdout: basePath} =
      await getFlipperLib().remoteServerContext.childProcess.exec(
        'npm root -g',
      );
    const devToolsPath = path.join(
      basePath.trim(),
      'react-devtools',
      'node_modules',
      'react-devtools-core',
    );
    await fs.stat(devToolsPath);
    return devToolsPath;
  } catch (error) {
    console.warn('Failed to find globally installed React DevTools: ' + error);
    return undefined;
  }
}

enum ConnectionStatus {
  Initializing = 'Initializing...',
  WaitingForReload = 'Waiting for connection from device...',
  WaitingForMetroReload = 'Waiting for Metro to reload...',
  Connected = 'Connected',
  Error = 'Error',
}

type DevToolsInstanceType = 'global' | 'internal' | 'oss';
type DevToolsInstance = {
  type: DevToolsInstanceType;
  module: ReactDevToolsStandaloneType;
};

export function devicePlugin(client: DevicePluginClient) {
  const metroDevice = client.device;

  const statusMessage = createState('initializing');
  const connectionStatus = createState<ConnectionStatus>(
    ConnectionStatus.Initializing,
  );
  const globalDevToolsPath = createState<string>();
  const useGlobalDevTools = createState(false, {
    persist: 'useGlobalDevTools',
    persistToLocalStorage: true,
  });

  let devToolsInstance = getDefaultDevToolsInstance();
  const selectedDevToolsInstanceType = createState<DevToolsInstanceType>(
    devToolsInstance.type,
  );

  let startResult: {close(): void} | undefined = undefined;

  let pollHandle: NodeJS.Timeout | undefined = undefined;

  let metroReloadAttempts = 0;

  function getGlobalDevToolsModule(): ReactDevToolsStandaloneType {
    const required = (global as any).electronRequire(
      globalDevToolsPath.get()!,
    ).default;
    return required.default ?? required;
  }

  function getOSSDevToolsModule(): ReactDevToolsStandaloneType {
    const required = require('react-devtools-core/standalone').default;
    return required.default ?? required;
  }

  function getInitialDevToolsInstance(): DevToolsInstance {
    // Load right library
    if (useGlobalDevTools.get()) {
      return {
        type: 'global',
        module: getGlobalDevToolsModule(),
      };
    } else {
      return getDefaultDevToolsInstance();
    }
  }

  function getDefaultDevToolsInstance(): DevToolsInstance {
    const type = client.isFB ? 'internal' : 'oss';
    const module = client.isFB
      ? getInternalDevToolsModule<ReactDevToolsStandaloneType>()
      : getOSSDevToolsModule();
    return {type, module};
  }

  function getDevToolsInstance(
    instanceType: DevToolsInstanceType,
  ): DevToolsInstance {
    let module;
    switch (instanceType) {
      case 'global':
        module = getGlobalDevToolsModule();
        break;
      case 'internal':
        module = getInternalDevToolsModule<ReactDevToolsStandaloneType>();
        break;
      case 'oss':
        module = getOSSDevToolsModule();
        break;
    }
    return {
      type: instanceType,
      module,
    };
  }

  async function setDevToolsInstance(instanceType: DevToolsInstanceType) {
    selectedDevToolsInstanceType.set(instanceType);

    if (instanceType === 'global') {
      if (!globalDevToolsPath.get()) {
        message.warn(
          "No globally installed react-devtools package found. Run 'npm install -g react-devtools'.",
        );
        return;
      }
      useGlobalDevTools.set(true);
    } else {
      useGlobalDevTools.set(false);
    }

    devToolsInstance = getDevToolsInstance(instanceType);

    await rebootDevTools();
  }

  async function toggleUseGlobalDevTools() {
    if (!globalDevToolsPath.get()) {
      message.warn(
        "No globally installed react-devtools package found. Run 'npm install -g react-devtools'.",
      );
      return;
    }
    selectedDevToolsInstanceType.update((prev: DevToolsInstanceType) => {
      if (prev === 'global') {
        devToolsInstance = getDefaultDevToolsInstance();
        return devToolsInstance.type;
      } else {
        devToolsInstance = getDevToolsInstance('global');
        return devToolsInstance.type;
      }
    });
    useGlobalDevTools.update((v) => !v);

    await rebootDevTools();
  }

  async function rebootDevTools() {
    metroReloadAttempts = 0;
    setStatus(ConnectionStatus.Initializing, 'Loading DevTools...');
    // clean old instance
    if (pollHandle) {
      clearTimeout(pollHandle);
    }
    startResult?.close();
    await sleep(5000); // wait for port to close
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
        'Starting DevTools server on ' + DEV_TOOLS_PORT,
      );
      startResult = devToolsInstance.module
        .setContentDOMNode(devToolsNode)
        .setStatusListener((message: string, status: string) => {
          // TODO: since devToolsInstance is an instance, we are probably leaking memory here
          if (typeof status === 'undefined') {
            // Preserves old behavior in case DevTools doesn't provide status,
            // which may happen if loading an older version of DevTools.
            setStatus(ConnectionStatus.Initializing, message);
            return;
          }

          switch (status) {
            case 'server-connected': {
              setStatus(ConnectionStatus.Initializing, message);
              break;
            }
            case 'devtools-connected': {
              if (pollHandle) {
                clearTimeout(pollHandle);
              }
              setStatus(ConnectionStatus.Connected, message);
              break;
            }
            case 'error': {
              if (pollHandle) {
                clearTimeout(pollHandle);
              }
              setStatus(ConnectionStatus.Error, message);
              break;
            }
          }
        })
        .startServer(DEV_TOOLS_PORT, 'localhost', undefined, {
          surface: 'flipper',
        });
      setStatus(ConnectionStatus.Initializing, 'Waiting for device...');
    } catch (e) {
      console.error('Failed to initalize React DevTools' + e);
      setStatus(ConnectionStatus.Error, 'Failed to initialize DevTools: ' + e);
    }

    setStatus(
      ConnectionStatus.Initializing,
      'DevTools initialized, waiting for connection...',
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

  client.onReady(async () => {
    const path = await findGlobalDevTools();
    if (path) {
      globalDevToolsPath.set(path + '/standalone');
      selectedDevToolsInstanceType.set('global');
      console.log('Found global React DevTools: ', path);
      // load it, if the flag is set
      devToolsInstance = getInitialDevToolsInstance();
    } else {
      useGlobalDevTools.set(false); // disable in case it was enabled
    }
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
    isFB: client.isFB,
    devtoolsHaveStarted,
    connectionStatus,
    statusMessage,
    bootDevTools,
    rebootDevTools,
    metroDevice,
    globalDevToolsPath,
    useGlobalDevTools,
    selectedDevToolsInstanceType,
    setDevToolsInstance,
    toggleUseGlobalDevTools,
  };
}

export function Component() {
  return (
    <Layout.Container grow>
      <DevToolsInstanceToolbar />
      <DevToolsEmbedder offset={40} nodeId={DEV_TOOLS_NODE_ID} />
    </Layout.Container>
  );
}

function DevToolsInstanceToolbar() {
  const instance = usePlugin(devicePlugin);
  const globalDevToolsPath = useValue(instance.globalDevToolsPath);
  const connectionStatus = useValue(instance.connectionStatus);
  const statusMessage = useValue(instance.statusMessage);
  const useGlobalDevTools = useValue(instance.useGlobalDevTools);
  const selectedDevToolsInstanceType = useValue(
    instance.selectedDevToolsInstanceType,
  );

  if (!globalDevToolsPath && !instance.isFB) {
    return null;
  }

  let selectionControl;
  if (instance.isFB) {
    const devToolsInstanceOptions = [{value: 'internal'}, {value: 'oss'}];
    if (globalDevToolsPath) {
      devToolsInstanceOptions.push({value: 'global'});
    }
    selectionControl = (
      <>
        Select preferred DevTools version:
        <Select
          options={devToolsInstanceOptions}
          value={selectedDevToolsInstanceType}
          onSelect={instance.setDevToolsInstance}
          style={{width: 90}}
          size="small"
        />
      </>
    );
  } else if (globalDevToolsPath) {
    selectionControl = (
      <>
        <Switch
          checked={useGlobalDevTools}
          onChange={instance.toggleUseGlobalDevTools}
          size="small"
        />
        Use globally installed DevTools
      </>
    );
  } else {
    throw new Error(
      'Should not render Toolbar if not FB build or a global DevTools install not available.',
    );
  }

  return (
    <Toolbar right={selectionControl} wash>
      {connectionStatus !== ConnectionStatus.Connected ? (
        <Typography.Text type="secondary">{statusMessage}</Typography.Text>
      ) : null}
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
  );
}
