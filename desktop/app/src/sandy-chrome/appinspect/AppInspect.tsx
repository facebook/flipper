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
import {useMemoize} from '../../utils/useMemoize';
import Client from '../../Client';
import {State} from '../../reducers';
import BaseDevice from '../../devices/BaseDevice';
import MetroDevice from '../../devices/MetroDevice';
import ArchivedDevice from '../../devices/ArchivedDevice';
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

  const metroDevice = useMemoize(findMetroDevice, [connections.devices]);
  const client = useMemoize(findBestClient, [
    connections.clients,
    connections.selectedApp,
    connections.userPreferredApp,
  ]);
  // // if the selected device is Metro, we want to keep the owner of the selected App as active device if possible
  const activeDevice = useMemoize(findBestDevice, [
    client,
    connections.devices,
    connections.selectedDevice,
    metroDevice,
    connections.userPreferredDevice,
  ]);
  const isDeviceArchived = useValue(activeDevice?.archivedState, false);
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
              isDeviceArchived,
              activeDevice,
              client,
              isAppConnected,
            )}
            {!isDeviceArchived && isAppConnected && <BookmarkSection />}
            {!isDeviceArchived && activeDevice && (
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

export function findBestClient(
  clients: Client[],
  selectedApp: string | null,
  userPreferredApp: string | null,
): Client | undefined {
  return clients.find((c) => c.id === (selectedApp || userPreferredApp));
}

export function findMetroDevice(
  devices: State['connections']['devices'],
): MetroDevice | undefined {
  return devices?.find(
    (device) => device.os === 'Metro' && !device.isArchived,
  ) as MetroDevice;
}

export function findBestDevice(
  client: Client | undefined,
  devices: State['connections']['devices'],
  selectedDevice: BaseDevice | null,
  metroDevice: BaseDevice | undefined,
  userPreferredDevice: string | null,
): BaseDevice | undefined {
  // if not Metro device, use the selected device as metro device
  const selected = selectedDevice ?? undefined;
  if (selected !== metroDevice) {
    return selected;
  }
  // if there is an active app, use device owning the app
  if (client) {
    return client.deviceSync;
  }
  // if no active app, use the preferred device
  if (userPreferredDevice) {
    return (
      devices.find((device) => device.title === userPreferredDevice) ?? selected
    );
  }
  return selected;
}

function renderStatusMessage(
  isDeviceArchived: boolean,
  activeDevice: BaseDevice | undefined,
  client: Client | undefined,
  isAppConnected: boolean,
): React.ReactNode {
  return isDeviceArchived ? (
    activeDevice instanceof ArchivedDevice ? (
      <Layout.Horizontal gap center>
        <FieldTimeOutlined style={{color: theme.primaryColor}} />
        <Text
          type="secondary"
          style={{
            textTransform: 'uppercase',
            fontSize: '0.8em',
          }}>
          Device loaded from file
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
