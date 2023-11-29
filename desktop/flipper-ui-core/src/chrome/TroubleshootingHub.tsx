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
import {Tabs} from 'flipper-plugin';
import SetupDoctorScreen from '../sandy-chrome/SetupDoctorScreen';
import {ConsoleLogs} from './ConsoleLogs';
import {FlipperMessages} from './FlipperMessages';
import {ConnectivityLogs} from './ConnectivityLogs';

export function TroubleshootingHub() {
  const items = React.useMemo(
    () => [
      {
        key: 'environment-check',
        label: 'Environment Check',
        children: (
          <SetupDoctorScreen visible modal={false} onClose={() => {}} />
        ),
      },
      {
        key: 'connectivity-logs',
        label: 'Connectivity Logs',
        children: <ConnectivityLogs />,
      },
      {
        key: 'console-logs',
        label: 'Console Logs',
        children: <ConsoleLogs />,
      },
      {
        key: 'messages',
        label: 'Messages',
        children: <FlipperMessages />,
      },
    ],
    [],
  );
  return (
    <Layout.Container grow>
      <Tabs defaultActiveKey="connectivity-logs" grow items={items} />
    </Layout.Container>
  );
}
