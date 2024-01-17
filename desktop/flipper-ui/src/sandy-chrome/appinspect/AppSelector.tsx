/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Button, Dropdown, Menu, Radio, Tooltip, Typography} from 'antd';
import {
  AppleOutlined,
  AndroidOutlined,
  WindowsOutlined,
  CaretDownOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import {Glyph, Layout, styled} from '../../ui';
import {DeviceOS, theme, useTrackedCallback, useValue} from 'flipper-plugin';
import {batch, useSelector} from 'react-redux';
import {useDispatch, useStore} from '../../utils/useStore';
import {
  getClientsByDevice,
  selectClient,
  selectDevice,
} from '../../reducers/connections';
import Client from '../../Client';
import {State} from '../../reducers';
import {brandColors, brandIcons, colors} from '../../ui/components/colors';
import {getSelectableDevices} from '../../selectors/connections';
import {NoDevices} from './NoDevices';
import BaseDevice from '../../devices/BaseDevice';
import {GK} from '../../utils/GK';

const {Text} = Typography;

function getOsIcon(os?: DeviceOS) {
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
  const selectableDevices = useSelector(getSelectableDevices);
  const {selectedDevice, clients, uninitializedClients, selectedAppId} =
    useStore((state) => state.connections);
  useValue(selectedDevice?.connected, false); // subscribe to future archived state changes

  const onSelectDevice = useTrackedCallback(
    'select-device',
    (device: BaseDevice) => {
      batch(() => {
        dispatch(selectDevice(device));
      });
    },
    [],
  );
  const onSelectApp = useTrackedCallback(
    'select-app',
    (_device: BaseDevice, client: Client) => {
      batch(() => {
        dispatch(selectClient(client.id));
      });
    },
    [],
  );

  const entries = computeEntries(
    selectableDevices,
    clients,
    uninitializedClients,
    onSelectDevice,
    onSelectApp,
  );
  // TODO: Fix this the next time the file is edited.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const client = clients.get(selectedAppId!);
  const gkSelfSufficiency = GK('flipper_self_sufficiency');

  return (
    <>
      {entries.length ? (
        <Radio.Group
          value={selectedAppId}
          size="small"
          style={{
            display: 'flex',
            flex: 1,
          }}>
          <Dropdown
            trigger={['click']}
            overlay={
              <Menu selectedKeys={selectedAppId ? [selectedAppId] : []}>
                {entries}
              </Menu>
            }>
            <AppInspectButton title="Select the device / app to inspect">
              <Layout.Horizontal gap center>
                {client?.query.rsocket ? (
                  <DeprecationIcon />
                ) : (
                  <AppIcon
                    appname={client?.query.app}
                    device={selectedDevice}
                  />
                )}
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
        <Layout.Horizontal gap center>
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
        </Layout.Horizontal>
      )}
      {
        /* Return the public component NoDevices if showGuide is false (This means that the user is not in the GK Allowlist) and no devices are detected */
        !gkSelfSufficiency && entries.length == 0 ? <NoDevices /> : null
      }
    </>
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

function AppIcon({
  appname,
  device,
}: {
  appname?: string;
  device?: BaseDevice | null;
}) {
  const invert = appname?.endsWith('Lite') ?? false;
  const brandName = appname?.replace(/ Lite$/, '');
  const color = brandName
    ? getColorByApp(brandName)
    : theme.backgroundTransparentHover;
  const icon = (brandName && (brandIcons as any)[brandName]) ?? device?.icon;
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

function DeprecationIcon() {
  return (
    <Tooltip title="RSockets are being deprecated at Flipper. Please, use the latest Flipper client in your app to migrate to WebSockets.">
      <AppIconContainer style={{background: theme.warningColor}}>
        <Glyph
          name="caution-triangle"
          size={24}
          variant="outline"
          color="white"
        />
      </AppIconContainer>
    </Tooltip>
  );
}

const AppIconContainer = styled.div({
  borderRadius: 4,
  width: 36,
  height: 36,
  padding: 6,
});

function computeEntries(
  selectableDevices: BaseDevice[],
  clients: Map<string, Client>,
  uninitializedClients: State['connections']['uninitializedClients'],
  onSelectDevice: (device: BaseDevice) => void,
  onSelectApp: (device: BaseDevice, client: Client) => void,
) {
  const entries = selectableDevices.map((device) => {
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
    const clientEntries = getClientsByDevice(device, clients).map((client) => (
      <Menu.Item
        key={client.id}
        onClick={() => {
          onSelectApp(device, client);
        }}>
        <Radio value={client.id} style={{marginLeft: theme.space.large}}>
          <ClientTitle client={client} />
        </Radio>
      </Menu.Item>
    ));
    return [deviceEntry, ...clientEntries];
  });
  if (uninitializedClients.length) {
    entries.push([
      <Menu.Item key="connecting" style={{fontWeight: 'bold'}}>
        Currently connecting...
      </Menu.Item>,
      ...uninitializedClients.map((client) => (
        <Menu.Item key={'connecting' + client.appName}>
          {`${client.appName} (${client.deviceName})`}
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

function getColorByApp(app?: string | null): string {
  // TODO: Fix this the next time the file is edited.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
