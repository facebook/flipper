/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Typography} from 'antd';
import {LeftSidebar, SidebarTitle, InfoIcon} from '../LeftSidebar';
import {Layout, Link, styled} from '../../ui';
import {theme, useValue} from 'flipper-plugin';
import {AppSelector} from './AppSelector';
import {useStore} from '../../utils/useStore';
import {PluginList} from './PluginList';
import ScreenCaptureButtons from '../../chrome/ScreenCaptureButtons';
import MetroButton from '../../chrome/MetroButton';
import {BookmarkSection} from './BookmarkSection';
import Client from '../../Client';
import BaseDevice from '../../devices/BaseDevice';
import {ExclamationCircleOutlined, FieldTimeOutlined} from '@ant-design/icons';

const {Text} = Typography;

const appTooltip = (
  <>
    Inspect apps by selecting connected devices and emulators. Navigate and
    bookmark frequent destinations in the app. Refresh, screenshot and
    screenrecord is also available.{' '}
    <Link href="https://fbflipper.com/docs/getting-started/index">
      Learn More
    </Link>
  </>
);

export function AppInspect() {
  const connections = useStore((state) => state.connections);

  const metroDevice = connections.metroDevice;
  const client = connections.activeClient;
  const activeDevice = connections.activeDevice;
  const isDeviceConnected = useValue(activeDevice?.connected, false);
  const isAppConnected = useValue(client?.connected, false);

  return (
    <LeftSidebar>
      <Layout.Top>
        <Layout.Container borderBottom>
          <SidebarTitle actions={<InfoIcon>{appTooltip}</InfoIcon>}>
            App Inspect
          </SidebarTitle>
          <Layout.Container padv="small" padh="medium" gap={theme.space.large}>
            <AppSelector />
            {renderStatusMessage(
              isDeviceConnected,
              activeDevice,
              client,
              isAppConnected,
            )}
            {isDeviceConnected && isAppConnected && <BookmarkSection />}
            {isDeviceConnected && activeDevice && (
              <Toolbar gap>
                <MetroButton />
                <ScreenCaptureButtons />
              </Toolbar>
            )}
          </Layout.Container>
        </Layout.Container>
        <Layout.ScrollContainer vertical padv={theme.space.large}>
          {activeDevice ? (
            <PluginList
              activeDevice={activeDevice}
              metroDevice={metroDevice}
              client={client}
            />
          ) : null}
        </Layout.ScrollContainer>
      </Layout.Top>
    </LeftSidebar>
  );
}

const Toolbar = styled(Layout.Horizontal)({
  '.ant-btn': {
    border: 'none',
  },
});

function renderStatusMessage(
  isDeviceConnected: boolean,
  activeDevice: BaseDevice | null,
  client: Client | null,
  isAppConnected: boolean,
): React.ReactNode {
  if (!activeDevice) {
    return;
  }
  return !isDeviceConnected ? (
    activeDevice.isArchived ? (
      <Layout.Horizontal gap center>
        <FieldTimeOutlined style={{color: theme.primaryColor}} />
        <Text
          type="secondary"
          style={{
            textTransform: 'uppercase',
            fontSize: '0.8em',
          }}>
          Imported device
        </Text>
      </Layout.Horizontal>
    ) : (
      <Layout.Horizontal gap center>
        <ExclamationCircleOutlined style={{color: theme.errorColor}} />
        <Text
          type="secondary"
          style={{
            textTransform: 'uppercase',
            fontSize: '0.8em',
            color: theme.errorColor,
          }}>
          Device disconnected
        </Text>
      </Layout.Horizontal>
    )
  ) : client ? (
    isAppConnected ? null /*connected*/ : (
      <Layout.Horizontal gap center>
        <ExclamationCircleOutlined style={{color: theme.errorColor}} />
        <Text
          type="secondary"
          style={{
            textTransform: 'uppercase',
            fontSize: '0.8em',
            color: theme.errorColor,
          }}>
          Application disconnected
        </Text>
      </Layout.Horizontal>
    )
  ) : (
    <Layout.Horizontal gap center>
      <ExclamationCircleOutlined style={{color: theme.warningColor}} />
      <Text
        type="secondary"
        style={{
          textTransform: 'uppercase',
          fontSize: '0.8em',
          color: theme.errorColor,
        }}>
        No application selected
      </Text>
    </Layout.Horizontal>
  );
}
