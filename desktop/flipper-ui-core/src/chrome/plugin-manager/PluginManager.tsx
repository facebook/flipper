/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Tab, Tabs} from 'flipper-plugin';
import PluginDebugger from './PluginDebugger';
import PluginInstaller from './PluginInstaller';
import {Modal} from 'antd';

export default function (props: {onHide: () => any}) {
  return (
    <Modal width={800} visible onCancel={props.onHide} footer={null}>
      <Tabs>
        <Tab tab="Plugin Status">
          <PluginDebugger />
        </Tab>
        <Tab tab="Install Plugins">
          <PluginInstaller autoHeight />
        </Tab>
      </Tabs>
    </Modal>
  );
}
