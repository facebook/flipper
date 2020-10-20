/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useEffect, useRef, useState} from 'react';
import {Alert, Badge, Button, Input, Menu, Tooltip, Typography} from 'antd';
import {LeftSidebar, SidebarTitle, InfoIcon} from '../LeftSidebar';
import {
  SettingOutlined,
  RocketOutlined,
  MailOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import {Glyph, Layout, Link, styled} from '../../ui';
import {theme} from '../theme';
import {useStore as useReduxStore} from 'react-redux';
import {showEmulatorLauncher} from './LaunchEmulator';
import {AppSelector} from './AppSelector';
import {useDispatch, useStore} from '../../utils/useStore';
import {getPluginTitle, sortPluginsByName} from '../../utils/pluginUtils';
import {PluginDefinition} from '../../plugin';
import {selectPlugin} from '../../reducers/connections';

const {SubMenu} = Menu;
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
  const store = useReduxStore();
  const selectedDevice = useStore((state) => state.connections.selectedDevice);
  return (
    <LeftSidebar>
      <Layout.Top scrollable>
        <Layout.Container borderBottom>
          <SidebarTitle actions={<InfoIcon>{appTooltip}</InfoIcon>}>
            App Inspect
          </SidebarTitle>
          <Layout.Vertical padv="small" padh="medium" gap={theme.space.large}>
            <AppSelector />
            <Input addonAfter={<SettingOutlined />} defaultValue="mysite" />
            <Layout.Horizontal gap>
              <Button icon={<SettingOutlined />} type="link" />
              <Button icon={<SettingOutlined />} type="link" />
              <Button
                icon={<RocketOutlined />}
                type="link"
                title="Start Emulator / Simulator..."
                onClick={() => {
                  showEmulatorLauncher(store);
                }}
              />
            </Layout.Horizontal>
          </Layout.Vertical>
        </Layout.Container>
        <Layout.Container padv={theme.space.large}>
          {selectedDevice ? (
            <PluginList />
          ) : (
            <Alert message="No device or app selected" type="info" />
          )}
        </Layout.Container>
      </Layout.Top>
    </LeftSidebar>
  );
}

function PluginList() {
  // const {selectedApp, selectedDevice} = useStore((state) => state.connections);

  return (
    <Layout.Container>
      <SidebarTitle>Plugins</SidebarTitle>
      <Layout.Container padv={theme.space.small} padh={theme.space.tiny}>
        <PluginMenu
          inlineIndent={8}
          onClick={() => {}}
          defaultOpenKeys={['device']}
          mode="inline">
          <DevicePlugins key="device" />
          <SubMenu
            key="sub1"
            title={
              <Layout.Right center>
                <Text strong>Header</Text>
                <Badge count={8}></Badge>
              </Layout.Right>
            }>
            <Menu.Item key="1" icon={<AppstoreOutlined />}>
              Option 1
            </Menu.Item>
            <Menu.Item key="2" icon={<AppstoreOutlined />}>
              Option 2
            </Menu.Item>
            <Menu.Item key="3">Option 3</Menu.Item>
            <Menu.Item key="4">Option 4</Menu.Item>
          </SubMenu>
          <SubMenu
            key="sub2"
            icon={<AppstoreOutlined />}
            title="Navigation Two">
            <Menu.Item key="5">Option 5</Menu.Item>
            <Menu.Item key="6">Option 6</Menu.Item>
            <Menu.Item key="7">Option 7</Menu.Item>
            <Menu.Item key="8">Option 8</Menu.Item>
          </SubMenu>
          <SubMenu
            key="sub4"
            title={
              <span>
                <SettingOutlined />
                <span>Navigation Three</span>
              </span>
            }>
            <Menu.Item key="9">Option 9</Menu.Item>
            <Menu.Item key="10">Option 10</Menu.Item>
            <Menu.Item key="11">Option 11</Menu.Item>
            <Menu.Item key="12">Option 12</Menu.Item>
          </SubMenu>
        </PluginMenu>
      </Layout.Container>
    </Layout.Container>
  );
}

function DevicePlugins(props: any) {
  const dispatch = useDispatch();
  const {selectedDevice, selectedPlugin} = useStore(
    (state) => state.connections,
  );
  const devicePlugins = useStore((state) => state.plugins.devicePlugins);
  if (selectedDevice?.devicePlugins.length === 0) {
    return null;
  }
  return (
    <SubMenu {...props} title={<Text strong>Device</Text>}>
      {selectedDevice!.devicePlugins
        .map((pluginName) => devicePlugins.get(pluginName)!)
        .sort(sortPluginsByName)
        .map((plugin) => (
          <Plugin
            key={plugin.id}
            isActive={plugin.id === selectedPlugin}
            onClick={() => {
              dispatch(
                selectPlugin({
                  selectedPlugin: plugin.id,
                  selectedApp: null,
                  deepLinkPayload: null,
                  selectedDevice,
                }),
              );
            }}
            plugin={plugin}
          />
        ))}
    </SubMenu>
  );
}

const Plugin: React.FC<{
  onClick: () => void;
  isActive: boolean;
  plugin: PluginDefinition;
  app?: string | null | undefined;
  helpRef?: any;
  provided?: any;
  onFavorite?: () => void;
  starred?: boolean; // undefined means: not starrable
}> = function (props) {
  const {isActive, plugin, onFavorite, starred, ...rest} = props;
  const domRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = domRef.current;
    if (isActive && node) {
      const rect = node.getBoundingClientRect();
      if (rect.top < 0 || rect.bottom > document.documentElement.clientHeight) {
        node.scrollIntoView();
      }
    }
  }, [isActive]);

  return (
    <Menu.Item
      {...rest}
      active={isActive}
      onClick={props.onClick}
      disabled={starred === false}>
      <Tooltip
        placement="right"
        title={
          <>
            {getPluginTitle(plugin)} ({plugin.version})
            {plugin.details?.description ? (
              <>
                <br />
                <br />
                {plugin.details?.description}
              </>
            ) : (
              ''
            )}
          </>
        }
        mouseEnterDelay={1}>
        <Layout.Horizontal center gap={10} ref={domRef}>
          <PluginIconWrapper>
            <Glyph size={16} name={plugin.icon || 'apps'} color="white" />
          </PluginIconWrapper>
          {getPluginTitle(plugin)}
        </Layout.Horizontal>
      </Tooltip>
      {/* {starred !== undefined && (!starred || isActive) && (
        <ToggleButton
          onClick={onFavorite}
          toggled={starred}
          tooltip="Click to enable / disable this plugin"
        />
      )} */}
    </Menu.Item>
  );
};

const iconStyle = {
  color: theme.white,
  background: theme.primaryColor,
  borderRadius: theme.borderRadius,
  width: 24,
  height: 24,
};

// TODO: move this largely to themes/base.less to make it the default?
// Dimensions are hardcoded as they correlate strongly
const PluginMenu = styled(Menu)({
  border: 'none',
  '.ant-menu-inline .ant-menu-item, .ant-menu-inline .ant-menu-submenu-title ': {
    width: '100%', // reset to remove weird bonus pixel from ANT
  },
  '.ant-menu-submenu > .ant-menu-submenu-title, .ant-menu-sub.ant-menu-inline > .ant-menu-item': {
    borderRadius: theme.borderRadius,
    height: '32px',
    lineHeight: '24px',
    padding: `4px 32px 4px 8px !important`,
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
  '.ant-menu-item .anticon': {
    ...iconStyle,
    lineHeight: '28px', // WUT?
  },
});

const PluginIconWrapper = styled.div({
  ...iconStyle,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
});
