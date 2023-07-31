/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Layout} from '../ui';
import React from 'react';
import {Tab, Tabs} from 'flipper-plugin';
import SetupDoctorScreen from '../sandy-chrome/SetupDoctorScreen';
import {ConsoleLogs} from './ConsoleLogs';
import {FlipperMessages} from './FlipperMessages';
import {ConnectivityLogs} from './ConnectivityLogs';

export function TroubleshootingHub() {
  return (
    <Layout.Container grow>
      <Tabs activeKey="connectivity-logs" grow>
        <Tab tab="Environment Check" tabKey="environment-check">
          <SetupDoctorScreen visible modal={false} onClose={() => {}} />
        </Tab>
        <Tab tab="Connectivity Logs" tabKey="connectivity-logs">
          <ConnectivityLogs />
        </Tab>
        <Tab tab="Console Logs" tabKey="console-logs">
          <ConsoleLogs />
        </Tab>
        <Tab tab="Messages" tabKey="messages">
          <FlipperMessages />
        </Tab>
      </Tabs>
    </Layout.Container>
  );
}
