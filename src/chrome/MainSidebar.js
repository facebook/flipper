/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {
  SonarPlugin,
  SonarDevicePlugin,
  SonarBasePlugin,
} from '../plugin.js';
import type BaseDevice from '../devices/BaseDevice.js';
import type Client from '../Client.js';

import {
  Component,
  Sidebar,
  FlexBox,
  ClickableListItem,
  colors,
  brandColors,
  Text,
  Glyph,
} from 'sonar';
import React from 'react';
import {devicePlugins} from '../device-plugins/index.js';
import plugins from '../plugins/index.js';
import {selectPlugin} from '../reducers/connections.js';
import {connect} from 'react-redux';

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
  onClick: () => void,
  isActive: boolean,
  plugin: Class<SonarBasePlugin<>>,
  app?: ?string,
}> {
  render() {
    const {isActive, plugin} = this.props;
    const app = this.props.app || 'Facebook';
    let iconColor = brandColors[app];

    if (!iconColor) {
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

    return (
      <CustomClickableListItem active={isActive} onClick={this.props.onClick}>
        <PluginIcon
          name={plugin.icon}
          backgroundColor={iconColor}
          color={colors.white}
        />
        <PluginName>{plugin.title}</PluginName>
      </CustomClickableListItem>
    );
  }
}

type MainSidebarProps = {|
  selectedPlugin: ?string,
  selectedApp: ?string,
  selectedDeviceIndex: number,
  selectPlugin: (payload: {
    selectedPlugin: ?string,
    selectedApp: ?string,
  }) => void,
  devices: Array<BaseDevice>,
  clients: Array<Client>,
|};

class MainSidebar extends Component<MainSidebarProps> {
  render() {
    const {
      devices,
      selectedDeviceIndex,
      selectedPlugin,
      selectedApp,
      selectPlugin,
    } = this.props;
    let {clients} = this.props;
    const device: BaseDevice = devices[selectedDeviceIndex];

    let enabledPlugins = [];
    for (const devicePlugin of devicePlugins) {
      if (device.supportsPlugin(devicePlugin)) {
        enabledPlugins.push(devicePlugin);
      }
    }
    enabledPlugins = enabledPlugins.sort((a, b) => {
      return (a.title || '').localeCompare(b.title);
    });

    clients = clients
      // currently we can't filter clients for a device, because all clients
      // are reporting `unknown` as their deviceID, due to a change in Android's
      // API.
      //.filter((client: Client) => client.getDevice() === device)
      .sort((a, b) => (a.query.app || '').localeCompare(b.query.app));

    return (
      <Sidebar position="left" width={200}>
        {devicePlugins
          .filter(device.supportsPlugin)
          .map((plugin: Class<SonarDevicePlugin<>>) => (
            <PluginSidebarListItem
              key={plugin.id}
              isActive={plugin.id === selectedPlugin}
              onClick={() =>
                selectPlugin({
                  selectedPlugin: plugin.id,
                  selectedApp: null,
                })
              }
              plugin={plugin}
            />
          ))}
        {clients.map((client: Client) => (
          // $FlowFixMe: Flow doesn't know of React.Fragment yet
          <React.Fragment key={client.id}>
            <SidebarHeader>{client.query.app}</SidebarHeader>
            {plugins
              .filter(
                (p: Class<SonarPlugin<>>) => client.plugins.indexOf(p.id) > -1,
              )
              .map((plugin: Class<SonarPlugin<>>) => (
                <PluginSidebarListItem
                  key={plugin.id}
                  isActive={
                    plugin.id === selectedPlugin && selectedApp === client.id
                  }
                  onClick={() =>
                    selectPlugin({
                      selectedPlugin: plugin.id,
                      selectedApp: client.id,
                    })
                  }
                  plugin={plugin}
                  app={client.query.app}
                />
              ))}
          </React.Fragment>
        ))}
      </Sidebar>
    );
  }
}

export default connect(
  ({
    connections: {devices, selectedDeviceIndex, selectedPlugin, selectedApp},
    server: {clients},
  }) => ({
    devices,
    selectedDeviceIndex,
    selectedPlugin,
    selectedApp,
    clients,
  }),
  {
    selectPlugin,
  },
)(MainSidebar);
