/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {RocketOutlined, WarningOutlined} from '@ant-design/icons';
import {Alert, Tooltip, Typography} from 'antd';
import {useTrackedCallback, Layout, theme} from 'flipper-plugin';
import {showEmulatorLauncher} from './LaunchEmulator';
import {useStore} from '../../utils/useStore';

const {Text, Link, Title} = Typography;

export function NoDevices() {
  const store = useStore();

  const onLaunchEmulator = useTrackedCallback(
    'select-emulator',
    () => {
      showEmulatorLauncher(store);
    },
    [],
  );

  return (
    <Tooltip
      title={
        <Alert
          type="info"
          message={
            <>
              <Title level={4}>No devices found</Title>
              <Text>
                Start a fresh emulator{' '}
                <RocketOutlined onClick={onLaunchEmulator} /> or check the{' '}
                <Link href="https://fbflipper.com/docs/getting-started/troubleshooting/">
                  troubleshooting guide
                </Link>
                .
              </Text>
            </>
          }
        />
      }>
      <Layout.Container
        style={{alignItems: 'center', justifyContent: 'space-around'}}>
        <WarningOutlined style={{fontSize: 32, color: theme.warningColor}} />
      </Layout.Container>
    </Tooltip>
  );
}
