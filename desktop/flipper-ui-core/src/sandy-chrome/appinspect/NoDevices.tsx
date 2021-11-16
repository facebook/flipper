/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {RocketOutlined} from '@ant-design/icons';
import {Alert, Typography} from 'antd';
import {useTrackedCallback} from 'flipper-plugin';
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
    <Alert
      type="info"
      message={
        <>
          <Title level={4}>No devices found</Title>
          <Text>
            Start a fresh emulator <RocketOutlined onClick={onLaunchEmulator} />{' '}
            or check the{' '}
            <Link href="https://fbflipper.com/docs/troubleshooting">
              troubleshooting guide
            </Link>
            .
          </Text>
        </>
      }
    />
  );
}
