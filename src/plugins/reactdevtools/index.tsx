/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import ReactDOM from 'react-dom';
import ReactDevToolsStandalone from 'react-devtools-core/standalone';
import {FlipperPlugin, AndroidDevice, styled} from 'flipper';
import React from 'react';
import getPort from 'get-port';
import address from 'address';
import {reverse} from './ADB';

const Container = styled('div')({
  display: 'flex',
  flex: '1 1 0%',
  justifyContent: 'center',
  alignItems: 'stretch',
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
  target.insertBefore(devToolsNode, target.childNodes[0]);
  devToolsNode.style.display = 'flex';
}

function detachDevTools(devToolsNode: HTMLElement) {
  devToolsNode.style.display = 'none';
  document.body && document.body.appendChild(devToolsNode);
}

export default class extends FlipperPlugin<{}, any, {}> {
  componentDidMount() {
    let devToolsNode = findDevToolsNode();
    if (!devToolsNode) {
      devToolsNode = createDevToolsNode();
      this.initializeDevTools(devToolsNode);
    }

    const currentComponentNode = ReactDOM.findDOMNode(this);
    currentComponentNode && attachDevTools(currentComponentNode, devToolsNode);
  }

  componentWillUnmount() {
    const devToolsNode = findDevToolsNode();
    devToolsNode && detachDevTools(devToolsNode);
  }

  async initializeDevTools(devToolsNode: HTMLElement) {
    const port = await getPort({port: 8097}); // default port for dev tools
    ReactDevToolsStandalone.setContentDOMNode(devToolsNode).startServer(port);
    const device = await this.getDevice();
    if (device) {
      const host =
        device.deviceType === 'physical'
          ? address.ip()
          : device instanceof AndroidDevice
          ? '10.0.2.2' // Host IP for Android emulator host system
          : 'localhost';
      this.client.call('config', {port, host});

      if (['quest', 'go', 'pacific'].includes(device.title.toLowerCase())) {
        reverse(port, port);
      }
    }
  }

  render() {
    return <Container />;
  }
}
