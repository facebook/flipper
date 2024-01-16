/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Typography} from 'antd';
import {LeftSidebar, SidebarTitle} from '../LeftSidebar';
import {Layout, styled} from '../../ui';
import {theme, useValue} from 'flipper-plugin';
import {PluginList} from './PluginList';
import {BookmarkSection} from './BookmarkSection';
import Client from '../../Client';
import {ExclamationCircleOutlined, FieldTimeOutlined} from '@ant-design/icons';
import {useSelector} from 'react-redux';
import {getActiveClient, getActiveDevice} from '../../selectors/connections';
import * as connections from '../../selectors/connections';
import {PluginActionsMenu} from '../../chrome/PluginActionsMenu';
import BaseDevice from '../../devices/BaseDevice';

const {Text} = Typography;

export function AppInspect() {
  const client = useSelector(getActiveClient);
  const activeDevice = useSelector(getActiveDevice);
  const isDeviceConnected = useValue(activeDevice?.connected, false);
  const isAppConnected = useValue(client?.connected, false);

  return (
    <LeftSidebar>
      <Layout.Top>
        <Layout.Container borderBottom>
          <Toolbar gap>
            <SidebarTitle>App Inspect</SidebarTitle>
            <div style={{flex: 1, marginRight: -16}} />
            <PluginActionsMenu />
          </Toolbar>
          <Layout.Container padv="small" padh="medium" gap={theme.space.large}>
            {isDeviceConnected && isAppConnected && <BookmarkSection />}
          </Layout.Container>
        </Layout.Container>
        <Layout.ScrollContainer vertical padv={theme.space.large}>
          {activeDevice ? (
            <PluginList activeDevice={activeDevice} client={client} />
          ) : null}
        </Layout.ScrollContainer>
      </Layout.Top>
    </LeftSidebar>
  );
}

const Toolbar = styled(Layout.Horizontal)({
  height: 32,
  '.ant-btn': {
    border: 'none',
  },
});

export function StatusMessage() {
  const client = useSelector(getActiveClient);
  const activeDevice = useSelector(getActiveDevice);
  const isDeviceConnected = useValue(activeDevice?.connected, false);
  const isAppConnected = useValue(client?.connected, false);
  const hasSelectableDevices = useSelector(connections.hasSelectableDevices);
  return (
    <>
      {renderStatusMessage(
        isDeviceConnected,
        activeDevice,
        client,
        isAppConnected,
        hasSelectableDevices,
      )}
    </>
  );
}

function renderStatusMessage(
  isDeviceConnected: boolean,
  activeDevice: BaseDevice | null,
  client: Client | null,
  isAppConnected: boolean,
  hasSelectableDevices: boolean,
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
  ) : hasSelectableDevices ? (
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
  ) : null /* no selectable devices */;
}
