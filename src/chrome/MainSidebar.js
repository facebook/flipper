/**
 * Copyright 2004-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {SonarBasePlugin} from '../plugin.js';
import type {Client} from '../server.js';

import {
  Component,
  Sidebar,
  FlexBox,
  ClickableList,
  ClickableListItem,
  colors,
  brandColors,
  Text,
  Glyph,
} from 'sonar';
import {devicePlugins} from '../device-plugins/index.js';
import type BaseDevice from '../devices/BaseDevice.js';
import PropTypes from 'prop-types';
import plugins from '../plugins/index.js';

const CustomClickableListItem = ClickableListItem.extends({
  paddingLeft: 10,
  display: 'flex',
  alignItems: 'center',
  marginBottom: 2,
});

const SidebarHeader = FlexBox.extends({
  display: 'block',
  alignItems: 'center',
  padding: 3,
  color: colors.macOSSidebarSectionTitle,
  fontSize: 11,
  fontWeight: 500,
  marginLeft: 7,
  textOverflow: 'ellipsis',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  flexShrink: 0,
});

const PluginShape = FlexBox.extends(
  {
    marginRight: 5,
    backgroundColor: props => props.backgroundColor,
    borderRadius: 3,
    flexShrink: 0,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  {
    ignoreAttributes: ['backgroundColor'],
  },
);

const PluginName = Text.extends({
  minWidth: 0,
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
});

function PluginIcon({
  backgroundColor,
  name,
  color,
}: {
  backgroundColor: string,
  name: string,
  color: string,
}) {
  return (
    <PluginShape backgroundColor={backgroundColor}>
      <Glyph size={12} name={name} color={color} />
    </PluginShape>
  );
}

class PluginSidebarListItem extends Component<{
  activePluginKey: ?string,
  activeAppKey: ?string,
  onActivatePlugin: (appKey: string, pluginKey: string) => void,
  appKey: string,
  appName?: string,
  isActive: boolean,
  Plugin: Class<SonarBasePlugin<>>,
  windowFocused: boolean,
}> {
  onClick = () => {
    const {props} = this;
    props.onActivatePlugin(props.appKey, props.Plugin.id);
  };

  render() {
    const {isActive, Plugin, windowFocused, appKey, appName} = this.props;

    let iconColor;
    if (appName != null) {
      iconColor = brandColors[appName];
    }

    if (iconColor == null) {
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

      iconColor = pluginColors[parseInt(appKey, 36) % pluginColors.length];
    }

    return (
      <CustomClickableListItem
        active={isActive}
        onClick={this.onClick}
        windowFocused={windowFocused}>
        <PluginIcon
          name={Plugin.icon}
          backgroundColor={
            isActive
              ? windowFocused
                ? colors.white
                : colors.macOSSidebarSectionTitle
              : iconColor
          }
          color={
            isActive
              ? windowFocused
                ? colors.macOSTitleBarIconSelected
                : colors.white
              : colors.white
          }
        />
        <PluginName>{Plugin.title}</PluginName>
      </CustomClickableListItem>
    );
  }
}

function PluginSidebarList(props: {|
  activePluginKey: ?string,
  activeAppKey: ?string,
  onActivatePlugin: (appKey: string, pluginKey: string) => void,
  appKey: string,
  appName?: string,
  enabledPlugins: Array<Class<SonarBasePlugin<>>>,
  windowFocused: boolean,
|}) {
  if (props.enabledPlugins.length === 0) {
    return <Text>No available plugins for this device</Text>;
  }

  return (
    <ClickableList>
      {props.enabledPlugins.map(Plugin => {
        const isActive =
          props.activeAppKey === props.appKey &&
          props.activePluginKey === Plugin.id;
        return (
          <PluginSidebarListItem
            key={Plugin.id}
            activePluginKey={props.activePluginKey}
            activeAppKey={props.activeAppKey}
            onActivatePlugin={props.onActivatePlugin}
            appKey={props.appKey}
            appName={props.appName}
            isActive={isActive}
            Plugin={Plugin}
            windowFocused={props.windowFocused}
          />
        );
      })}
    </ClickableList>
  );
}

function AppSidebarInfo(props: {|
  client: Client,
  appKey: string,
  activePluginKey: ?string,
  activeAppKey: ?string,
  onActivatePlugin: (appKey: string, pluginKey: string) => void,
  windowFocused: boolean,
|}): any {
  const {appKey, client, windowFocused} = props;

  let enabledPlugins = [];
  for (const Plugin of plugins) {
    if (client.supportsPlugin(Plugin)) {
      enabledPlugins.push(Plugin);
    }
  }
  enabledPlugins = enabledPlugins.sort((a, b) => {
    return (a.title || '').localeCompare(b.title);
  });

  return [
    <SidebarHeader key={client.query.app}>{`${client.query.app} (${
      client.query.os
    }) - ${client.query.device}`}</SidebarHeader>,
    <PluginSidebarList
      key={`list-${appKey}`}
      activePluginKey={props.activePluginKey}
      activeAppKey={props.activeAppKey}
      onActivatePlugin={props.onActivatePlugin}
      appKey={appKey}
      appName={client.query.app}
      enabledPlugins={enabledPlugins}
      windowFocused={windowFocused}
    />,
  ];
}

type MainSidebarProps = {|
  activePluginKey: ?string,
  activeAppKey: ?string,
  onActivatePlugin: (appKey: string, pluginKey: string) => void,
  devices: Array<BaseDevice>,
  server: Server,
|};

export default class MainSidebar extends Component<MainSidebarProps> {
  static contextTypes = {
    windowIsFocused: PropTypes.bool,
  };

  render() {
    const connections = Array.from(this.props.server.connections.values()).sort(
      (a, b) => {
        return (a.client.query.app || '').localeCompare(b.client.query.app);
      },
    );

    const sidebarContent = connections.map(conn => {
      const {client} = conn;

      return (
        <AppSidebarInfo
          key={`app=${client.id}`}
          client={client}
          appKey={client.id}
          activePluginKey={this.props.activePluginKey}
          activeAppKey={this.props.activeAppKey}
          onActivatePlugin={this.props.onActivatePlugin}
          windowFocused={this.context.windowIsFocused}
        />
      );
    });

    let {devices} = this.props;
    devices = devices.sort((a, b) => {
      return (a.title || '').localeCompare(b.title);
    });

    for (const device of devices) {
      let enabledPlugins = [];
      for (const DevicePlugin of devicePlugins) {
        if (device.supportsPlugin(DevicePlugin)) {
          enabledPlugins.push(DevicePlugin);
        }
      }
      enabledPlugins = enabledPlugins.sort((a, b) => {
        return (a.title || '').localeCompare(b.title);
      });

      sidebarContent.unshift([
        <SidebarHeader key={device.title}>{device.title}</SidebarHeader>,
        <PluginSidebarList
          key={`list-${device.serial}`}
          activePluginKey={this.props.activePluginKey}
          activeAppKey={this.props.activeAppKey}
          onActivatePlugin={this.props.onActivatePlugin}
          appKey={device.serial}
          enabledPlugins={enabledPlugins}
          windowFocused={this.context.windowIsFocused}
        />,
      ]);
    }

    return (
      <Sidebar
        position="left"
        width={200}
        backgroundColor={
          this.context.windowIsFocused ? 'transparent' : '#f6f6f6'
        }>
        {sidebarContent}
      </Sidebar>
    );
  }
}
