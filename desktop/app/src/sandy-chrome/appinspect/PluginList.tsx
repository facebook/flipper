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
import {
  PlusOutlined,
  MinusOutlined,
  DeleteOutlined,
  LoadingOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import {Glyph, Layout, styled} from '../../ui';
import {theme, NUX, Tracked, useValue, useMemoize} from 'flipper-plugin';
import {useDispatch, useStore} from '../../utils/useStore';
import {getPluginTitle, getPluginTooltip} from '../../utils/pluginUtils';
import {selectPlugin} from '../../reducers/connections';
import Client from '../../Client';
import BaseDevice from '../../devices/BaseDevice';
import {DownloadablePluginDetails} from 'flipper-plugin-lib';
import MetroDevice from '../../devices/MetroDevice';
import {
  DownloadablePluginState,
  PluginDownloadStatus,
  startPluginDownload,
} from '../../reducers/pluginDownloads';
import {
  loadPlugin,
  switchPlugin,
  uninstallPlugin,
} from '../../reducers/pluginManager';
import {BundledPluginDetails} from 'flipper-plugin-lib';
import {reportUsage} from '../../utils/metrics';
import ConnectivityStatus from './fb-stubs/ConnectivityStatus';
import {useSelector} from 'react-redux';
import {getPluginLists} from '../../selectors/connections';

const {SubMenu} = Menu;
const {Text} = Typography;

export const PluginList = memo(function PluginList({
  client,
  activeDevice,
  metroDevice,
}: {
  client: Client | null;
  activeDevice: BaseDevice | null;
  metroDevice: MetroDevice | null;
}) {
  const dispatch = useDispatch();
  const connections = useStore((state) => state.connections);
  const plugins = useStore((state) => state.plugins);
  const pluginLists = useSelector(getPluginLists);
  const downloads = useStore((state) => state.pluginDownloads);
  const isConnected = useValue(activeDevice?.connected, false);
  const metroConnected = useValue(metroDevice?.connected, false);

  const {
    devicePlugins,
    metroPlugins,
    enabledPlugins,
    disabledPlugins,
    unavailablePlugins,
    downloadablePlugins,
  } = pluginLists;

  const isArchived = activeDevice?.isArchived;

  const annotatedDownloadablePlugins = useMemoize<
    [
      Record<string, DownloadablePluginState>,
      (DownloadablePluginDetails | BundledPluginDetails)[],
    ],
    [
      plugin: DownloadablePluginDetails | BundledPluginDetails,
      downloadStatus?: PluginDownloadStatus,
    ][]
  >(
    (downloads, downloadablePlugins) => {
      const downloadMap = new Map(
        Object.values(downloads).map((x) => [x.plugin.id, x]),
      );
      return downloadablePlugins.map((plugin) => [
        plugin,
        downloadMap.get(plugin.id)?.status,
      ]);
    },
    [downloads, downloadablePlugins],
  );

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
  const handleEnablePlugin = useCallback(
    (id: string) => {
      const plugin = (plugins.clientPlugins.get(id) ??
        plugins.devicePlugins.get(id))!;
      dispatch(
        switchPlugin({
          selectedApp: client?.query.app,
          plugin,
        }),
      );
    },
    [client, plugins.clientPlugins, plugins.devicePlugins, dispatch],
  );
  const handleInstallPlugin = useCallback(
    (id: string) => {
      const plugin = downloadablePlugins.find((p) => p.id === id)!;
      reportUsage('plugin:install', {version: plugin.version}, plugin.id);
      if (plugin.isBundled) {
        dispatch(loadPlugin({plugin, enable: true, notifyIfFailed: true}));
      } else {
        dispatch(startPluginDownload({plugin, startedByUser: true}));
      }
    },
    [downloadablePlugins, dispatch],
  );
  const handleUninstallPlugin = useCallback(
    (id: string) => {
      const plugin = disabledPlugins.find((p) => p.id === id)!;
      reportUsage('plugin:uninstall', {version: plugin.version}, plugin.id);
      dispatch(uninstallPlugin({plugin}));
    },
    [disabledPlugins, dispatch],
  );
  return (
    <Layout.Container>
      <SidebarTitle actions={<ConnectivityStatus />}>Plugins</SidebarTitle>
      <Layout.Container padv={theme.space.small} padh={theme.space.tiny}>
        <PluginMenu
          inlineIndent={8}
          onClick={() => {}}
          defaultOpenKeys={['device', 'enabled', 'metro']}
          selectedKeys={
            connections.selectedPlugin
              ? [
                  (connections.selectedDevice === metroDevice ? 'metro:' : '') +
                    connections.selectedPlugin,
                ]
              : []
          }
          mode="inline">
          <PluginGroup key="device" title="Device">
            {devicePlugins.map((plugin) => (
              <PluginEntry
                key={plugin.id}
                plugin={plugin.details}
                scrollTo={
                  plugin.id === connections.selectedPlugin &&
                  connections.selectedDevice === activeDevice
                }
                onClick={handleAppPluginClick}
                tooltip={getPluginTooltip(plugin.details)}
                actions={
                  isArchived ? null : (
                    <ActionButton
                      id={plugin.id}
                      onClick={handleEnablePlugin}
                      title="Disable plugin"
                      icon={
                        <MinusOutlined size={16} style={{marginRight: 0}} />
                      }
                    />
                  )
                }
              />
            ))}
          </PluginGroup>

          {!isArchived && metroConnected && (
            <PluginGroup
              key="metro"
              title="React Native"
              hint="The following plugins are exposed by the currently running Metro instance. Note that Metro might currently be connected to a different application or device than selected above.">
              {metroPlugins.map((plugin) => (
                <PluginEntry
                  key={'metro:' + plugin.id}
                  plugin={plugin.details}
                  scrollTo={
                    plugin.id === connections.selectedPlugin &&
                    connections.selectedDevice === metroDevice
                  }
                  onClick={handleMetroPluginClick}
                  tooltip={getPluginTooltip(plugin.details)}
                />
              ))}
            </PluginGroup>
          )}
          <PluginGroup key="enabled" title="Enabled">
            {enabledPlugins.map((plugin) => (
              <PluginEntry
                key={plugin.id}
                plugin={plugin.details}
                scrollTo={plugin.id === connections.selectedPlugin}
                onClick={handleAppPluginClick}
                tooltip={getPluginTooltip(plugin.details)}
                actions={
                  isConnected ? (
                    <ActionButton
                      id={plugin.id}
                      onClick={handleEnablePlugin}
                      title="Disable plugin"
                      icon={
                        <MinusOutlined size={16} style={{marginRight: 0}} />
                      }
                    />
                  ) : null
                }
              />
            ))}
          </PluginGroup>
          {isConnected && (
            <PluginGroup
              key="disabled"
              title="Disabled"
              hint="This section shows the plugins that are currently disabled. If a plugin is enabled, you will be able to interact with it. If a plugin is disabled it won't consume resources in Flipper or in the connected application.">
              {disabledPlugins.map((plugin) => (
                <PluginEntry
                  key={plugin.id}
                  plugin={plugin.details}
                  scrollTo={plugin.id === connections.selectedPlugin}
                  tooltip={getPluginTooltip(plugin.details)}
                  onClick={handleAppPluginClick}
                  actions={
                    <>
                      <ActionButton
                        id={plugin.id}
                        title="Uninstall plugin"
                        onClick={handleUninstallPlugin}
                        icon={
                          <DeleteOutlined size={16} style={{marginRight: 0}} />
                        }
                      />
                      <ActionButton
                        id={plugin.id}
                        title="Enable plugin"
                        onClick={handleEnablePlugin}
                        icon={
                          <PlusOutlined size={16} style={{marginRight: 0}} />
                        }
                      />
                    </>
                  }
                  disabled
                />
              ))}
            </PluginGroup>
          )}
          <PluginGroup
            key="uninstalled"
            title="Detected in App"
            hint="The plugins below are supported by the selected device / application, but not installed in Flipper.
            To install plugin, hover it and click to the 'Download' icon.">
            {annotatedDownloadablePlugins.map(([plugin, downloadStatus]) => (
              <PluginEntry
                key={plugin.id}
                plugin={plugin}
                scrollTo={plugin.id === connections.selectedPlugin}
                tooltip={getPluginTooltip(plugin)}
                onClick={handleAppPluginClick}
                actions={
                  <ActionButton
                    id={plugin.id}
                    title="Download and install plugin"
                    onClick={handleInstallPlugin}
                    icon={
                      downloadStatus ? (
                        <LoadingOutlined size={16} style={{marginRight: 0}} />
                      ) : (
                        <DownloadOutlined size={16} style={{marginRight: 0}} />
                      )
                    }
                  />
                }
                disabled
              />
            ))}
          </PluginGroup>
          {isConnected && (
            <PluginGroup
              key="unavailable"
              title="Unavailable plugins"
              hint="The plugins below are installed in Flipper, but not available for the selected device / application. Hover the plugin info box to find out why.">
              {unavailablePlugins.map(([plugin, reason]) => (
                <PluginEntry
                  key={plugin.id}
                  plugin={plugin}
                  tooltip={`${getPluginTitle(plugin)} (${plugin.id}@${
                    plugin.version
                  }): ${reason}`}
                  onClick={handleAppPluginClick}
                  disabled
                  actions={<InfoIcon>{reason}</InfoIcon>}
                />
              ))}
            </PluginGroup>
          )}
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
      onClick={(e) => {
        onClick(id);
        e.stopPropagation();
      }}
    />
  );
}

const PluginEntry = function PluginEntry({
  plugin,
  disabled,
  tooltip,
  onClick,
  scrollTo,
  actions,
  ...rest
}: {
  plugin: {id: string; title: string; icon?: string; version: string};
  disabled?: boolean;
  scrollTo?: boolean;
  tooltip: string;
  onClick?: (id: string) => void;
  actions?: React.ReactElement | null;
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
    if (scrollTo) {
      domRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [scrollTo]);

  return (
    <Tracked action={`open:${plugin.id}`}>
      <Menu.Item
        {...rest}
        key={plugin.id}
        style={{cursor: 'pointer'}}
        onClick={handleClick}>
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
    </Tracked>
  );
};

const PluginGroup = memo(function PluginGroup({
  title,
  children,
  hint,
  ...rest
}: {title: string; children: React.ReactElement[]; hint?: string} & Record<
  string,
  any
>) {
  if (children.length === 0) {
    return null;
  }

  let badge = (
    <Badge
      count={children.length}
      style={{
        marginRight: 20,
      }}
    />
  );
  if (hint) {
    badge = (
      <NUX title={hint} placement="right">
        {badge}
      </NUX>
    );
  }

  return (
    <SubMenu
      {...rest}
      title={
        <Layout.Right center>
          <Text strong>{title}</Text>

          {badge}
        </Layout.Right>
      }>
      {children}
    </SubMenu>
  );
});

// Dimensions are hardcoded as they correlate strongly
const PluginMenu = styled(Menu)({
  userSelect: 'none',
  border: 'none',
  '.ant-typography': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  '.ant-menu-sub.ant-menu-inline': {
    background: theme.backgroundDefault,
  },
  '.ant-menu-inline .ant-menu-item, .ant-menu-inline .ant-menu-submenu-title ':
    {
      width: '100%', // reset to remove weird bonus pixel from ANT
    },
  '.ant-menu-submenu > .ant-menu-submenu-title, .ant-menu-sub.ant-menu-inline > .ant-menu-item':
    {
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
  '.ant-menu-submenu-inline > .ant-menu-submenu-title .ant-menu-submenu-arrow':
    {
      right: 8,
    },
  '.ant-badge-count': {
    color: theme.textColorSecondary,
    // border: `1px solid ${theme.dividerColor}`,
    background: 'transparent',
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
