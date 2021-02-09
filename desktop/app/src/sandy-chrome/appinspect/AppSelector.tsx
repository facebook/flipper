/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Alert, Button, Dropdown, Menu, Radio, Typography} from 'antd';
import {
  AppleOutlined,
  AndroidOutlined,
  WindowsOutlined,
  CaretDownOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import {Glyph, Layout, styled} from '../../ui';
import {theme, useTrackedCallback, useValue} from 'flipper-plugin';
import {batch} from 'react-redux';
import {useDispatch, useStore} from '../../utils/useStore';
import {
  canBeDefaultDevice,
  getAvailableClients,
  selectClient,
  selectDevice,
} from '../../reducers/connections';
import BaseDevice, {OS} from '../../devices/BaseDevice';
import Client from '../../Client';
import {State} from '../../reducers';
import {brandColors, brandIcons, colors} from '../../ui/components/colors';
import {showEmulatorLauncher} from './LaunchEmulator';
import ArchivedDevice from '../../devices/ArchivedDevice';

const {Text, Link, Title} = Typography;

function getOsIcon(os?: OS) {
  switch (os) {
    case 'iOS':
      return <AppleOutlined />;
    case 'Android':
      return <AndroidOutlined />;
    case 'Windows':
      return <WindowsOutlined />;
    default:
      undefined;
  }
}

export function AppSelector() {
  const dispatch = useDispatch();
  const {
    devices,
    selectedDevice,
    clients,
    uninitializedClients,
    selectedApp,
  } = useStore((state) => state.connections);
  useValue(selectedDevice?.connected, false); // subscribe to future archived state changes

  const onSelectDevice = useTrackedCallback(
    'select-device',
    (device: BaseDevice) => {
      batch(() => {
        dispatch(selectDevice(device));
        dispatch(selectClient(null));
      });
    },
    [],
  );
  const onSelectApp = useTrackedCallback(
    'select-app',
    (device: BaseDevice, client: Client) => {
      batch(() => {
        dispatch(selectDevice(device));
        dispatch(selectClient(client.id));
      });
    },
    [],
  );

  const entries = computeEntries(
    devices,
    clients,
    uninitializedClients,
    onSelectDevice,
    onSelectApp,
  );
  const client = clients.find((client) => client.id === selectedApp);

  return entries.length ? (
    <Radio.Group
      value={selectedApp}
      size="small"
      style={{
        display: 'flex',
        flex: 1,
      }}>
      <Dropdown
        overlay={
          <Menu selectedKeys={selectedApp ? [selectedApp] : []}>{entries}</Menu>
        }>
        <AppInspectButton title="Select the device / app to inspect">
          <Layout.Horizontal gap center>
            <AppIcon appname={client?.query.app} />
            <Layout.Container grow shrink>
              <Text strong>{client?.query.app ?? ''}</Text>
              <Text>{selectedDevice?.title || 'Available devices'}</Text>
            </Layout.Container>
            <CaretDownOutlined />
          </Layout.Horizontal>
        </AppInspectButton>
      </Dropdown>
    </Radio.Group>
  ) : (
    <NoDevices />
  );
}

const AppInspectButton = styled(Button)({
  background: theme.backgroundTransparentHover,
  height: 52,
  border: 'none',
  fontWeight: 'normal',
  flex: `1 1 0`,
  overflow: 'hidden', // required for ellipsis
  paddingLeft: theme.space.small,
  paddingRight: theme.space.small,
  textAlign: 'left',
  '&:hover, &:focus, &:active': {
    background: theme.backgroundTransparentHover,
  },
  '.ant-typography': {
    lineHeight: '20px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
});

function AppIcon({appname}: {appname?: string}) {
  const invert = appname?.endsWith('Lite') ?? false;
  const brandName = appname?.replace(/ Lite$/, '');
  const color = brandName
    ? getColorByApp(brandName)
    : theme.backgroundTransparentHover;
  const icon = brandName && (brandIcons as any)[brandName];
  return (
    <AppIconContainer style={{background: invert ? 'white' : color}}>
      {icon && (
        <Glyph
          name={icon}
          size={24}
          variant="outline"
          color={invert ? color : 'white'}
        />
      )}
    </AppIconContainer>
  );
}

const AppIconContainer = styled.div({
  borderRadius: 4,
  width: 36,
  height: 36,
  padding: 6,
});

function computeEntries(
  devices: BaseDevice[],
  clients: Client[],
  uninitializedClients: State['connections']['uninitializedClients'],
  onSelectDevice: (device: BaseDevice) => void,
  onSelectApp: (device: BaseDevice, client: Client) => void,
) {
  const entries = devices
    .filter(
      (device) =>
        // hide non default devices, unless they have a connected client
        canBeDefaultDevice(device) ||
        clients.some((c) => c.deviceSync === device),
    )
    .map((device) => {
      const deviceEntry = (
        <Menu.Item
          icon={getOsIcon(device.os)}
          key={device.serial}
          style={{fontWeight: 'bold'}}
          onClick={() => {
            onSelectDevice(device);
          }}>
          <DeviceTitle device={device} />
        </Menu.Item>
      );
      const clientEntries = getAvailableClients(device, clients).map(
        (client) => (
          <Menu.Item
            key={client.id}
            onClick={() => {
              onSelectApp(device, client);
            }}>
            <Radio value={client.id}>
              <ClientTitle client={client} />
            </Radio>
          </Menu.Item>
        ),
      );
      return [deviceEntry, ...clientEntries];
    });
  if (uninitializedClients.length) {
    entries.push([
      <Menu.Item key="connecting" style={{fontWeight: 'bold'}}>
        Currently connecting...
      </Menu.Item>,
      ...uninitializedClients.map((client) => (
        <Menu.Item key={'connecting' + client.client.appName}>
          {client.client.appName}
        </Menu.Item>
      )),
    ]);
  }
  return entries.flat();
}

function DeviceTitle({device}: {device: BaseDevice}) {
  const connected = useValue(device.connected);
  const isImported = device.isArchived;
  return (
    <span>
      <>{device.title} </>
      {!connected || isImported ? (
        <span
          style={{
            textTransform: 'uppercase',
            fontSize: '0.6em',
            color: isImported ? theme.primaryColor : theme.errorColor,
            fontWeight: 'bold',
          }}>
          {isImported ? '(Imported)' : '(Offline)'}
        </span>
      ) : null}
    </span>
  );
}

function ClientTitle({client}: {client: Client}) {
  const connected = useValue(client.connected);
  return (
    <span>
      <>{client.query.app} </>
      {!connected ? (
        <span
          style={{
            textTransform: 'uppercase',
            fontSize: '0.6em',
            color: theme.errorColor,
            fontWeight: 'bold',
          }}>
          (Offline)
        </span>
      ) : null}
    </span>
  );
}

function NoDevices() {
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

function getColorByApp(app?: string | null): string {
  let iconColor: string | undefined = (brandColors as any)[app!];

  if (!iconColor) {
    if (!app) {
      // Device plugin
      iconColor = colors.macOSTitleBarIconBlur;
    } else {
      const pluginColors = [
        colors.seaFoam,
        colors.teal,
        colors.lime,
        colors.lemon,
        colors.orange,
        colors.tomato,
        colors.cherry,
        colors.pink,
        colors.grape,
      ];

      iconColor = pluginColors[parseInt(app, 36) % pluginColors.length];
    }
  }
  return iconColor;
}
