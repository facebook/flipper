/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import ReactDevToolsStandalone from 'react-devtools-core/standalone';
import {FlipperPlugin, AndroidDevice, styled, View, Toolbar} from 'flipper';
import React from 'react';
import getPort from 'get-port';
import address from 'address';

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

export default class extends FlipperPlugin<
  {
    status: string;
  },
  any,
  {}
> {
  pollHandle?: NodeJS.Timeout;
  containerRef: React.RefObject<HTMLDivElement> = React.createRef();
  triedToAutoConnect = false;

  state = {
    status: 'initializing',
  };

  componentDidMount() {
    let devToolsNode = findDevToolsNode();
    if (!devToolsNode) {
      devToolsNode = createDevToolsNode();
      this.initializeDevTools(devToolsNode);
    } else {
      this.setStatus(
        'DevTools have been initialized, waiting for connection...',
      );
      if (devToolsNode.innerHTML) {
        this.setStatus(CONNECTED);
      } else {
        this.startPollForConnection();
      }
    }

    attachDevTools(this.containerRef?.current!, devToolsNode);
    this.startPollForConnection();
  }

  componentWillUnmount() {
    if (this.pollHandle) {
      clearTimeout(this.pollHandle);
    }
    const devToolsNode = findDevToolsNode();
    devToolsNode && detachDevTools(devToolsNode);
  }

  setStatus(status: string) {
    console.log(`[ReactDevtoolsPlugin] ${status}`);
    if (status.startsWith('The server is listening on')) {
      this.setState({status: status + ' Waiting for connection...'});
    } else {
      this.setState({status});
    }
  }

  startPollForConnection() {
    this.pollHandle = setTimeout(() => {
      if (findDevToolsNode()?.innerHTML) {
        this.setStatus(CONNECTED);
      } else {
        if (!this.triedToAutoConnect) {
          this.triedToAutoConnect = true;
          this.setStatus(
            "The DevTools didn't connect yet. Please open the DevMenu or Reload to connect",
          );
          // TODO: send reload command
        }
        this.startPollForConnection();
      }
    }, 3000);
  }

  async initializeDevTools(devToolsNode: HTMLElement) {
    this.setStatus('Waiting for port 8097');
    const port = await getPort({port: 8097}); // default port for dev tools
    this.setStatus('Starting DevTools server on ' + port);
    ReactDevToolsStandalone.setContentDOMNode(devToolsNode)
      .setStatusListener(status => {
        this.setStatus(status);
      })
      .startServer(port);
    this.setStatus('Waiting for device');
    const device = await this.getDevice();

    if (device) {
      const host =
        device.deviceType === 'physical'
          ? address.ip()
          : device instanceof AndroidDevice
          ? '10.0.2.2' // Host IP for Android emulator host system
          : 'localhost';
      this.setStatus(`Updating config to ${host}:${port}`);
      this.client.call('config', {port, host});

      if (['quest', 'go', 'pacific'].includes(device.title.toLowerCase())) {
        const device = await this.getDevice();
        this.setStatus(`Setting up reverse port mapping: ${port}:${port}`);
        (device as AndroidDevice).reverse([port, port]);
      }
    }
  }

  render() {
    return (
      <View grow>
        {this.state.status !== CONNECTED ? (
          <Toolbar>{this.state.status}</Toolbar>
        ) : null}
        <Container ref={this.containerRef} />
      </View>
    );
  }
}
