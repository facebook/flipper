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
  FlipperDevicePlugin,
  AndroidDevice,
  styled,
  View,
  MetroDevice,
  ReduxState,
  connect,
  Device,
  CenteredView,
  RoundedSection,
  Text,
  Button,
} from 'flipper';
import React, {useEffect} from 'react';
import getPort from 'get-port';

const Container = styled.div({
  display: 'flex',
  flex: '1 1 0%',
  justifyContent: 'center',
  alignItems: 'stretch',
  height: '100%',
});

const DEV_TOOLS_NODE_ID = 'reactdevtools-out-of-react-node';

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

type GrabMetroDeviceStoreProps = {metroDevice: MetroDevice};
type GrabMetroDeviceOwnProps = {onHasDevice(device: MetroDevice): void};

// Utility component to grab the metroDevice from the store if there is one
const GrabMetroDevice = connect<
  GrabMetroDeviceStoreProps,
  {},
  GrabMetroDeviceOwnProps,
  ReduxState
>(({connections: {devices}}) => ({
  metroDevice: devices.find(
    (device) => device.os === 'Metro' && !device.isArchived,
  ) as MetroDevice,
}))(function ({
  metroDevice,
  onHasDevice,
}: GrabMetroDeviceStoreProps & GrabMetroDeviceOwnProps) {
  useEffect(() => {
    onHasDevice(metroDevice);
  }, [metroDevice, onHasDevice]);
  return null;
});

const SUPPORTED_OCULUS_DEVICE_TYPES = ['quest', 'go', 'pacific'];

enum ConnectionStatus {
  Initializing = 'Initializing...',
  WaitingForReload = 'Waiting for connection from device...',
  Connected = 'Connected',
  Error = 'Error',
}

export default class ReactDevTools extends FlipperDevicePlugin<
  {status: string},
  any,
  {}
> {
  static supportsDevice(device: Device) {
    return !device.isArchived && device.os === 'Metro';
  }

  pollHandle?: NodeJS.Timeout;
  containerRef: React.RefObject<HTMLDivElement> = React.createRef();
  connectionStatus: ConnectionStatus = ConnectionStatus.Initializing;
  metroDevice?: MetroDevice;
  isMounted = true;

  state = {
    status: 'initializing',
  };

  componentDidMount() {
    this.bootDevTools();
  }

  componentWillUnmount() {
    this.isMounted = false;
    if (this.pollHandle) {
      clearTimeout(this.pollHandle);
    }
    const devToolsNode = findDevToolsNode();
    devToolsNode && detachDevTools(devToolsNode);
  }

  setStatus(connectionStatus: ConnectionStatus, status: string) {
    this.connectionStatus = connectionStatus;
    if (!this.isMounted) {
      return;
    }
    if (status.startsWith('The server is listening on')) {
      this.setState({status: status + ' Waiting for connection...'});
    } else {
      this.setState({status});
    }
  }

  devtoolsHaveStarted() {
    return !!findDevToolsNode()?.innerHTML;
  }

  bootDevTools() {
    let devToolsNode = findDevToolsNode();
    if (!devToolsNode) {
      devToolsNode = createDevToolsNode();
      this.initializeDevTools(devToolsNode);
    }
    this.setStatus(
      ConnectionStatus.Initializing,
      'DevTools have been initialized, waiting for connection...',
    );
    if (this.devtoolsHaveStarted()) {
      this.setStatus(ConnectionStatus.Connected, CONNECTED);
    } else {
      this.startPollForConnection();
    }

    attachDevTools(this.containerRef?.current!, devToolsNode);
    this.startPollForConnection();
  }

  startPollForConnection(delay = 3000) {
    this.pollHandle = setTimeout(() => {
      switch (true) {
        // Closed already, ignore
        case !this.isMounted:
          return;
        // Found DevTools!
        case this.devtoolsHaveStarted():
          this.setStatus(ConnectionStatus.Connected, CONNECTED);
          return;
        // Waiting for connection, but we do have an active Metro connection, lets force a reload to enter Dev Mode on app
        // prettier-ignore
        case this.connectionStatus === ConnectionStatus.Initializing && !!this.metroDevice?.ws:
          this.setStatus(
            ConnectionStatus.WaitingForReload,
            "Sending 'reload' to Metro to force the DevTools to connect...",
          );
          this.metroDevice!.sendCommand('reload');
          this.startPollForConnection(10000);
          return;
        // Waiting for initial connection, but no WS bridge available
        case this.connectionStatus === ConnectionStatus.Initializing:
          this.setStatus(
            ConnectionStatus.WaitingForReload,
            "The DevTools didn't connect yet. Please trigger the DevMenu in the React Native app, or Reload it to connect",
          );
          this.startPollForConnection(10000);
          return;
        // Still nothing? Users might not have done manual action, or some other tools have picked it up?
        case this.connectionStatus === ConnectionStatus.WaitingForReload:
          this.setStatus(
            ConnectionStatus.WaitingForReload,
            "The DevTools didn't connect yet. Please verify your React Native app is in development mode, and that no other instance of the React DevTools are attached to the app already.",
          );
          this.startPollForConnection();
          return;
      }
    }, delay);
  }

  async initializeDevTools(devToolsNode: HTMLElement) {
    try {
      this.setStatus(ConnectionStatus.Initializing, 'Waiting for port 8097');
      const port = await getPort({port: 8097}); // default port for dev tools
      this.setStatus(
        ConnectionStatus.Initializing,
        'Starting DevTools server on ' + port,
      );
      ReactDevToolsStandalone.setContentDOMNode(devToolsNode)
        .setStatusListener((status) => {
          this.setStatus(ConnectionStatus.Initializing, status);
        })
        .startServer(port);
      this.setStatus(ConnectionStatus.Initializing, 'Waiting for device');
      const device = this.device;

      if (device) {
        if (
          device.deviceType === 'physical' ||
          SUPPORTED_OCULUS_DEVICE_TYPES.includes(device.title.toLowerCase())
        ) {
          this.setStatus(
            ConnectionStatus.Initializing,
            `Setting up reverse port mapping: ${port}:${port}`,
          );
          (device as AndroidDevice).reverse([port, port]);
        }
      }
    } catch (e) {
      console.error(e);
      this.setStatus(
        ConnectionStatus.Error,
        'Failed to initialize DevTools: ' + e,
      );
    }
  }

  render() {
    return (
      <View grow>
        {!this.devtoolsHaveStarted() ? this.renderStatus() : null}
        <Container ref={this.containerRef} />
        <GrabMetroDevice
          onHasDevice={(device) => {
            this.metroDevice = device;
          }}
        />
      </View>
    );
  }

  renderStatus() {
    return (
      <CenteredView>
        <RoundedSection title={this.connectionStatus}>
          <Text>{this.state.status}</Text>
          {(this.connectionStatus === ConnectionStatus.WaitingForReload &&
            this.metroDevice?.ws) ||
          this.connectionStatus === ConnectionStatus.Error ? (
            <Button
              style={{width: 200, margin: '10px auto 0 auto'}}
              onClick={() => {
                this.metroDevice?.sendCommand('reload');
                this.bootDevTools();
              }}>
              Retry
            </Button>
          ) : null}
        </RoundedSection>
      </CenteredView>
    );
  }
}
