/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {ExclamationCircleOutlined, RocketOutlined} from '@ant-design/icons';
import {Tooltip, Typography} from 'antd';
import {useTrackedCallback, Layout, theme, styled} from 'flipper-plugin';
import {showEmulatorLauncher} from './LaunchEmulator';
import {useStore} from '../../utils/useStore';
import {keyframes} from '@emotion/css';

const {Text, Link, Title} = Typography;

export function NoDevices({
  showTroubleshootingGuide,
}: {
  showTroubleshootingGuide: (source: string) => void;
}) {
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
      color="white"
      style={{backgroundColor: 'transparent'}}
      title={
        <Layout.Container gap="tiny" pad="tiny">
          <Title level={4}>No devices found</Title>
          <Text color="white">
            <Link onClick={() => onLaunchEmulator()}>
              Start a fresh emulator <RocketOutlined />
            </Link>{' '}
            or if you are struggling to connect try the{' '}
            <Link
              onClick={() => {
                showTroubleshootingGuide('no-devices');
              }}>
              troubleshooting wizard
            </Link>
            .
          </Text>
        </Layout.Container>
      }>
      <PulsingBorder>
        <ExclamationCircleOutlined style={{color: theme.warningColor}} />
        <Text
          type="secondary"
          style={{
            textTransform: 'uppercase',
            fontSize: '0.8em',
            color: theme.errorColor,
          }}>
          No devices found
        </Text>
      </PulsingBorder>
    </Tooltip>
  );
}

const PulsingBorder = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  border-style: solid;
  gap: ${theme.space.small}px;
  padding: ${theme.space.small}px;
  border-radius: ${theme.space.small}px;
  border: 1px solid ${theme.errorColor};
  animation: ${keyframes`
    0% {
      scale: 1;
      border-opacity: 1;
    }

    50% {
      scale: 1.02;
      border-opacity: 0;
    }
    100% {
      scale: 1;
      border-opacity: 1;

    }
  `} 2s infinite ease-in-out alternate;
`;
