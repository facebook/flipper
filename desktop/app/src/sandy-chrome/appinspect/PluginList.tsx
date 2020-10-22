/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {memo, useCallback, useEffect, useRef, useState} from 'react';
import {Badge, Button, Menu, Tooltip, Typography} from 'antd';
import {InfoIcon, SidebarTitle} from '../LeftSidebar';
import {PlusOutlined, MinusOutlined} from '@ant-design/icons';
import {Glyph, Layout, styled} from '../../ui';
import {theme} from '../theme';
import {useDispatch, useStore} from '../../utils/useStore';
import {getPluginTitle, sortPluginsByName} from '../../utils/pluginUtils';
import {ClientPluginDefinition, DevicePluginDefinition} from '../../plugin';
import {selectPlugin, starPlugin} from '../../reducers/connections';
import Client from '../../Client';
import {State} from '../../reducers';
import BaseDevice from '../../devices/BaseDevice';
import {getFavoritePlugins} from '../../chrome/mainsidebar/sidebarUtils';
import {PluginDetails} from 'flipper-plugin-lib';
import {useMemoize} from '../../utils/useMemoize';

const {SubMenu} = Menu;
const {Text} = Typography;

export const PluginList = memo(function PluginList() {
  const dispatch = useDispatch();
  const connections = useStore((state) => state.connections);
  const plugins = useStore((state) => state.plugins);

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
  const {
    devicePlugins,
    metroPlugins,
    enabledPlugins,
    disabledPlugins,
    unavailablePlugins,
  } = useMemoize(computePluginLists, [
    activeDevice,
    metroDevice,
    client,
    plugins,
    connections.userStarredPlugins,
  ]);

  const handleAppPluginClick = useCallback(
    (pluginId) => {
      dispatch(
        selectPlugin({
          selectedPlugin: pluginId,
          selectedApp: connections.selectedApp,
          deepLinkPayload: null,
          selectedDevice: activeDevice,
        }),
      );
    },
    [dispatch, activeDevice, connections.selectedApp],
  );
  const handleMetroPluginClick = useCallback(
    (pluginId) => {
      dispatch(
        selectPlugin({
          selectedPlugin: pluginId,
          selectedApp: connections.selectedApp,
          deepLinkPayload: null,
          selectedDevice: metroDevice,
        }),
      );
    },
    [dispatch, metroDevice, connections.selectedApp],
  );
  const handleStarPlugin = useCallback(
    (id: string) => {
      dispatch(
        starPlugin({
          selectedApp: client!.query.app,
          plugin: plugins.clientPlugins.get(id)!,
        }),
      );
    },
    [client, plugins.clientPlugins, dispatch],
  );

  return (
    <Layout.Container>
      <SidebarTitle>Plugins</SidebarTitle>
      <Layout.Container padv={theme.space.small} padh={theme.space.tiny}>
        <PluginMenu
          inlineIndent={8}
          onClick={() => {}}
          defaultOpenKeys={['device', 'enabled', 'metro']}
          mode="inline">
          <PluginGroup key="device" title="Device">
            {devicePlugins.map((plugin) => (
              <PluginEntry
                key={plugin.id}
                plugin={plugin.details}
                active={
                  plugin.id === connections.selectedPlugin &&
                  connections.selectedDevice === activeDevice
                }
                onClick={handleAppPluginClick}
                tooltip={getPluginTooltip(plugin.details)}
              />
            ))}
          </PluginGroup>

          <PluginGroup key="metro" title="React Native">
            {metroPlugins.map((plugin) => (
              <PluginEntry
                key={'metro' + plugin.id}
                plugin={plugin.details}
                active={
                  plugin.id === connections.selectedPlugin &&
                  connections.selectedDevice === metroDevice
                }
                onClick={handleMetroPluginClick}
                tooltip={getPluginTooltip(plugin.details)}
              />
            ))}
          </PluginGroup>
          <PluginGroup key="enabled" title="Enabled">
            {enabledPlugins.map((plugin) => (
              <PluginEntry
                key={plugin.id}
                plugin={plugin.details}
                active={plugin.id === connections.selectedPlugin}
                onClick={handleAppPluginClick}
                tooltip={getPluginTooltip(plugin.details)}
                actions={
                  <ActionButton
                    id={plugin.id}
                    onClick={handleStarPlugin}
                    title="Disable plugin"
                    icon={<MinusOutlined size={16} style={{marginRight: 0}} />}
                  />
                }
              />
            ))}
          </PluginGroup>
          <PluginGroup key="disabled" title="Disabled">
            {disabledPlugins.map((plugin) => (
              <PluginEntry
                key={plugin.id}
                plugin={plugin.details}
                active={plugin.id === connections.selectedPlugin}
                tooltip={getPluginTooltip(plugin.details)}
                actions={
                  <ActionButton
                    id={plugin.id}
                    title="Enable plugin"
                    onClick={handleStarPlugin}
                    icon={<PlusOutlined size={16} style={{marginRight: 0}} />}
                  />
                }
                disabled
              />
            ))}
          </PluginGroup>
          <PluginGroup key="unavailable" title="Unavailable plugins">
            {unavailablePlugins.map(([plugin, reason]) => (
              <PluginEntry
                key={plugin.id}
                plugin={plugin}
                tooltip={`${getPluginTitle(plugin)} (${plugin.id}@${
                  plugin.version
                }): ${reason}`}
                disabled
                actions={<InfoIcon>{reason}</InfoIcon>}
              />
            ))}
          </PluginGroup>
        </PluginMenu>
      </Layout.Container>
    </Layout.Container>
  );
});

function ActionButton({
  icon,
  onClick,
  id,
  title,
}: {
  id: string;
  title: string;
  icon: React.ReactElement;
  onClick: (id: string) => void;
}) {
  return (
    <Button
      size="small"
      icon={icon}
      title={title}
      style={{border: 'none', color: theme.textColorPrimary}}
      onClick={() => {
        onClick(id);
      }}
    />
  );
}

const PluginEntry = memo(function PluginEntry({
  plugin,
  disabled,
  tooltip,
  onClick,
  active,
  actions,
  ...rest
}: {
  plugin: {id: string; title: string; icon?: string; version: string};
  disabled?: boolean;
  active?: boolean;
  tooltip: string;
  onClick?: (id: string) => void;
  actions?: React.ReactElement;
}) {
  const [hovering, setHovering] = useState(false);

  const handleMouseEnter = useCallback(() => {
    setHovering(true);
  }, []);
  const handleMouseLeave = useCallback(() => {
    setHovering(false);
  }, []);

  const handleClick = useCallback(() => {
    onClick?.(plugin.id);
  }, [onClick, plugin.id]);

  const domRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = domRef.current;
    if (active && node) {
      const rect = node.getBoundingClientRect();
      if (rect.top < 0 || rect.bottom > document.documentElement.clientHeight) {
        node.scrollIntoView();
      }
    }
  }, [active]);

  return (
    <Menu.Item
      key={plugin.id}
      active={active}
      disabled={disabled}
      onClick={handleClick}
      {...rest}>
      <Layout.Horizontal
        center
        gap={10}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}>
        <PluginIconWrapper disabled={disabled} ref={domRef}>
          <Glyph size={16} name={plugin.icon || 'apps'} color="white" />
        </PluginIconWrapper>
        <Tooltip placement="right" title={tooltip} mouseEnterDelay={1}>
          <Text style={{flex: 1}}>{getPluginTitle(plugin)}</Text>
        </Tooltip>
        {hovering && actions}
      </Layout.Horizontal>
    </Menu.Item>
  );
});

const PluginGroup = memo(function PluginGroup({
  title,
  children,
  ...rest
}: {title: string; children: React.ReactElement[]} & Record<string, any>) {
  if (children.length === 0) {
    return null;
  }
  return (
    <SubMenu
      {...rest}
      title={
        <Layout.Right center>
          <Text strong>{title}</Text>
          <Badge
            count={children.length}
            style={{
              marginRight: 20,
            }}
          />
        </Layout.Right>
      }>
      {children}
    </SubMenu>
  );
});

function getPluginTooltip(details: PluginDetails): string {
  return `${getPluginTitle(details)} (${details.id}@${details.version}) ${
    details.description ?? ''
  }`;
}

export function findBestClient(
  clients: Client[],
  selectedApp: string | null,
  userPreferredApp: string | null,
): Client | undefined {
  return clients.find((c) => c.id === (selectedApp || userPreferredApp));
}

export function findMetroDevice(
  devices: State['connections']['devices'],
): BaseDevice | undefined {
  return devices?.find((device) => device.os === 'Metro' && !device.isArchived);
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
  if (client && client._deviceResolved) {
    return client._deviceResolved;
  }
  // if no active app, use the preferred device
  if (userPreferredDevice) {
    return (
      devices.find((device) => device.title === userPreferredDevice) ?? selected
    );
  }
  return selected;
}

export function computePluginLists(
  device: BaseDevice | undefined,
  metroDevice: BaseDevice | undefined,
  client: Client | undefined,
  plugins: State['plugins'],
  userStarredPlugins: State['connections']['userStarredPlugins'],
) {
  const devicePlugins: DevicePluginDefinition[] =
    device?.devicePlugins.map((name) => plugins.devicePlugins.get(name)!) ?? [];
  const metroPlugins: DevicePluginDefinition[] =
    metroDevice?.devicePlugins.map(
      (name) => plugins.devicePlugins.get(name)!,
    ) ?? [];
  const enabledPlugins: ClientPluginDefinition[] = [];
  const disabledPlugins: ClientPluginDefinition[] = [];
  const unavailablePlugins: [plugin: PluginDetails, reason: string][] = [];

  if (device) {
    // find all device plugins that aren't part of the current device / metro
    const detectedDevicePlugins = new Set([
      ...device.devicePlugins,
      ...(metroDevice?.devicePlugins ?? []),
    ]);
    for (const [name, definition] of plugins.devicePlugins.entries()) {
      if (!detectedDevicePlugins.has(name)) {
        unavailablePlugins.push([
          definition.details,
          `Device plugin '${getPluginTitle(
            definition.details,
          )}' is not supported by the current device type.`,
        ]);
      }
    }
  }

  // process all client plugins
  if (device && client) {
    const clientPlugins = Array.from(plugins.clientPlugins.values()).sort(
      sortPluginsByName,
    );
    const favoritePlugins = getFavoritePlugins(
      device,
      client,
      clientPlugins,
      client && userStarredPlugins[client.query.app],
      true,
    );

    client &&
      clientPlugins.forEach((plugin) => {
        if (!client.plugins.includes(plugin.id)) {
          unavailablePlugins.push([
            plugin.details,
            `Plugin '${getPluginTitle(
              plugin.details,
            )}' is not loaded by the client application`,
          ]);
        } else if (favoritePlugins.includes(plugin)) {
          enabledPlugins.push(plugin);
        } else {
          disabledPlugins.push(plugin);
        }
      });
  }

  // process problematic plugins
  plugins.disabledPlugins.forEach((plugin) => {
    unavailablePlugins.push([plugin, 'Plugin is disabled by configuration']);
  });
  plugins.gatekeepedPlugins.forEach((plugin) => {
    unavailablePlugins.push([
      plugin,
      `This plugin is only available to members of gatekeeper '${plugin.gatekeeper}'`,
    ]);
  });
  plugins.failedPlugins.forEach(([plugin, error]) => {
    unavailablePlugins.push([
      plugin,
      `Flipper failed to load this plugin: '${error}'`,
    ]);
  });

  devicePlugins.sort(sortPluginsByName);
  metroPlugins.sort(sortPluginsByName);
  unavailablePlugins.sort(([a], [b]) => {
    return getPluginTitle(a) > getPluginTitle(b) ? 1 : -1;
  });

  return {
    devicePlugins,
    metroPlugins,
    enabledPlugins,
    disabledPlugins,
    unavailablePlugins,
  };
}

// Dimensions are hardcoded as they correlate strongly
const PluginMenu = styled(Menu)({
  userSelect: 'none',
  border: 'none',
  '.ant-typography': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  '.ant-menu-inline .ant-menu-item, .ant-menu-inline .ant-menu-submenu-title ': {
    width: '100%', // reset to remove weird bonus pixel from ANT
  },
  '.ant-menu-submenu > .ant-menu-submenu-title, .ant-menu-sub.ant-menu-inline > .ant-menu-item': {
    borderRadius: theme.borderRadius,
    height: '32px',
    lineHeight: '24px',
    padding: `4px 8px !important`,
    '&:hover': {
      color: theme.textColorPrimary,
      background: theme.backgroundTransparentHover,
    },
    '&.ant-menu-item-selected::after': {
      border: 'none',
    },
    '&.ant-menu-item-selected': {
      color: theme.white,
      background: theme.primaryColor,
      border: 'none',
    },
    '&.ant-menu-item-selected .ant-typography': {
      color: theme.white,
    },
  },
  '.ant-menu-submenu-inline > .ant-menu-submenu-title .ant-menu-submenu-arrow': {
    right: 8,
  },
  '.ant-badge-count': {
    color: theme.textColorPrimary,
    background: theme.backgroundTransparentHover,
    fontWeight: 'bold',
    padding: `0 10px`,
    boxShadow: 'none',
  },
});

const PluginIconWrapper = styled.div<{disabled?: boolean}>(({disabled}) => ({
  ...iconStyle(!!disabled),
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}));

function iconStyle(disabled: boolean) {
  return {
    color: theme.white,
    background: disabled ? theme.disabledColor : theme.primaryColor,
    borderRadius: theme.borderRadius,
    width: 24,
    height: 24,
  };
}
