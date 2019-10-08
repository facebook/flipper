/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import config from '../fb-stubs/config';
import BaseDevice from '../devices/BaseDevice';
import Client from '../Client';
import {UninitializedClient} from '../UninitializedClient';
import {FlipperBasePlugin} from '../plugin';
import {PluginNotification} from '../reducers/notifications';
import {ActiveSheet, ACTIVE_SHEET_PLUGINS} from '../reducers/application';
import {State as Store} from '../reducers';
import {
  Sidebar,
  FlexBox,
  colors,
  brandColors,
  Text,
  Glyph,
  styled,
  FlexColumn,
  GK,
  FlipperPlugin,
  FlipperDevicePlugin,
  LoadingIndicator,
} from 'flipper';
import React, {Component, PureComponent} from 'react';
import NotificationsHub from '../NotificationsHub';
import {
  selectPlugin,
  showMoreOrLessPlugins,
  StaticView,
  setStaticView,
} from '../reducers/connections';
import {setActiveSheet} from '../reducers/application';
import UserAccount from './UserAccount';
import {connect} from 'react-redux';
import {BackgroundColorProperty} from 'csstype';
import {
  MAX_MINIMUM_PLUGINS,
  SHOW_REMAINING_PLUGIN_IF_LESS_THAN,
} from '../Client';
import {StyledOtherComponent} from 'create-emotion-styled';
import SupportRequestForm from '../fb-stubs/SupportRequestForm';

const ListItem = styled('div')(({active}: {active?: boolean}) => ({
  paddingLeft: 10,
  display: 'flex',
  alignItems: 'center',
  marginBottom: 2,
  flexShrink: 0,
  backgroundColor: active ? colors.macOSTitleBarIconSelected : 'none',
  color: active ? colors.white : colors.macOSSidebarSectionItem,
  lineHeight: '25px',
  padding: '0 10px',
  '&[disabled]': {
    color: 'rgba(0, 0, 0, 0.5)',
  },
}));

const SidebarHeader = styled(FlexBox)({
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

const PluginShape = styled(FlexBox)(
  ({backgroundColor}: {backgroundColor?: BackgroundColorProperty}) => ({
    marginRight: 5,
    backgroundColor,
    borderRadius: 3,
    flexShrink: 0,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  }),
);

const PluginName = styled(Text)(
  (props: {isActive?: boolean; count?: number}) => ({
    minWidth: 0,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexGrow: 1,
    '::after': {
      fontSize: 12,
      display: props.count ? 'inline-block' : 'none',
      padding: '0 8px',
      lineHeight: '17px',
      height: 17,
      alignSelf: 'center',
      content: `"${props.count}"`,
      borderRadius: '999em',
      color: props.isActive ? colors.macOSTitleBarIconSelected : colors.white,
      backgroundColor: props.isActive
        ? colors.white
        : colors.macOSTitleBarIconSelected,
      fontWeight: 500,
    },
  }),
);

const Plugins = styled(FlexColumn)({
  flexGrow: 1,
  overflow: 'auto',
});

const PluginDebugger = styled(FlexBox)({
  color: colors.blackAlpha50,
  alignItems: 'center',
  padding: 10,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

const PluginShowMoreOrLess = styled(ListItem)({
  color: colors.blue,
  fontSize: 10,
  lineHeight: '10px',
  paddingBottom: 5,
});

function PluginIcon({
  isActive,
  backgroundColor,
  name,
  color,
}: {
  isActive: boolean;
  backgroundColor?: string;
  name: string;
  color: string;
}) {
  return (
    <PluginShape backgroundColor={backgroundColor}>
      <Glyph size={12} name={name} color={isActive ? colors.white : color} />
    </PluginShape>
  );
}

class PluginSidebarListItem extends Component<{
  onClick: () => void;
  isActive: boolean;
  plugin: typeof FlipperBasePlugin;
  app?: string | null | undefined;
}> {
  render() {
    const {isActive, plugin} = this.props;
    const app = this.props.app || 'Facebook';
    let iconColor: string | undefined = (brandColors as any)[app];

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
      <ListItem active={isActive} onClick={this.props.onClick}>
        <PluginIcon
          isActive={isActive}
          name={plugin.icon || 'apps'}
          backgroundColor={iconColor}
          color={colors.white}
        />
        <PluginName>{plugin.title || plugin.id}</PluginName>
      </ListItem>
    );
  }
}

const Spinner = centerInSidebar(LoadingIndicator);

const ErrorIndicator = centerInSidebar(Glyph);

function centerInSidebar(
  component: StyledOtherComponent<any, {}, any> | React.ComponentType<any>,
) {
  return styled(component)({
    marginTop: '10px',
    marginBottom: '10px',
    marginLeft: 'auto',
    marginRight: 'auto',
  });
}

type OwnProps = {};

type StateFromProps = {
  numNotifications: number;
  windowIsFocused: boolean;
  selectedDevice: BaseDevice | null | undefined;
  staticView: StaticView;
  selectedPlugin: string | null | undefined;
  selectedApp: string | null | undefined;
  clients: Array<Client>;
  uninitializedClients: Array<{
    client: UninitializedClient;
    deviceId?: string;
    errorMessage?: string;
  }>;
  devicePlugins: Map<string, typeof FlipperDevicePlugin>;
  clientPlugins: Map<string, typeof FlipperPlugin>;
};

type DispatchFromProps = {
  selectPlugin: (payload: {
    selectedPlugin: string | null;
    selectedApp: string | null;
    deepLinkPayload: string | null;
  }) => void;
  setActiveSheet: (activeSheet: ActiveSheet) => void;
  setStaticView: (payload: StaticView) => void;
  showMoreOrLessPlugins: (payload: string) => void;
};

type Props = OwnProps & StateFromProps & DispatchFromProps;
class MainSidebar extends PureComponent<Props> {
  render() {
    const {
      selectedDevice,
      selectedPlugin,
      staticView,
      selectedApp,
      selectPlugin,
      setStaticView,
      windowIsFocused,
      numNotifications,
    } = this.props;
    let {clients, uninitializedClients} = this.props;
    clients = clients
      .filter(
        (client: Client) =>
          selectedDevice && selectedDevice.supportsOS(client.query.os),
      )
      .sort((a, b) => (a.query.app || '').localeCompare(b.query.app));

    const byPluginNameOrId = (
      a: typeof FlipperBasePlugin,
      b: typeof FlipperBasePlugin,
    ) => ((a.title || a.id) > (b.title || b.id) ? 1 : -1);

    return (
      <Sidebar
        position="left"
        width={200}
        backgroundColor={
          process.platform === 'darwin' && windowIsFocused ? 'transparent' : ''
        }>
        <Plugins>
          {!GK.get('flipper_disable_notifications') && (
            <ListItem
              active={selectedPlugin === 'notifications'}
              onClick={() =>
                selectPlugin({
                  selectedPlugin: 'notifications',
                  selectedApp: null,
                  deepLinkPayload: null,
                })
              }>
              <PluginIcon
                color={colors.light50}
                name={
                  numNotifications > 0
                    ? NotificationsHub.icon || 'bell'
                    : 'bell-null'
                }
                isActive={selectedPlugin === NotificationsHub.id}
              />
              <PluginName
                count={numNotifications}
                isActive={selectedPlugin === NotificationsHub.id}>
                {NotificationsHub.title}
              </PluginName>
            </ListItem>
          )}
          {GK.get('flipper_support_requests') && (
            <ListItem
              active={staticView != null && staticView === SupportRequestForm}
              onClick={() => setStaticView(SupportRequestForm)}>
              <PluginIcon
                color={colors.light50}
                name={'app-dailies'}
                isActive={
                  staticView != null && staticView === SupportRequestForm
                }
              />
              <PluginName
                isActive={
                  staticView != null && staticView === SupportRequestForm
                }>
                Litho Support Request
              </PluginName>
            </ListItem>
          )}
          {selectedDevice && (
            <SidebarHeader>{selectedDevice.title}</SidebarHeader>
          )}
          {selectedDevice &&
            Array.from(this.props.devicePlugins.values())
              .filter(plugin => plugin.supportsDevice(selectedDevice))
              .sort(byPluginNameOrId)
              .map((plugin: typeof FlipperDevicePlugin) => (
                <PluginSidebarListItem
                  key={plugin.id}
                  isActive={plugin.id === selectedPlugin}
                  onClick={() =>
                    selectPlugin({
                      selectedPlugin: plugin.id,
                      selectedApp: null,
                      deepLinkPayload: null,
                    })
                  }
                  plugin={plugin}
                />
              ))}
          {clients
            .filter(
              (client: Client) =>
                (selectedDevice &&
                  client.query.device_id === selectedDevice.serial) ||
                // Old android sdk versions don't know their device_id
                // Display their plugins under all selected devices until they die out
                client.query.device_id === 'unknown',
            )
            .map((client: Client) => {
              const plugins = Array.from(
                this.props.clientPlugins.values(),
              ).filter(
                (p: typeof FlipperPlugin) => client.plugins.indexOf(p.id) > -1,
              );

              const minShowPluginsCount =
                plugins.length <
                MAX_MINIMUM_PLUGINS + SHOW_REMAINING_PLUGIN_IF_LESS_THAN
                  ? plugins.length
                  : MAX_MINIMUM_PLUGINS;

              return (
                <React.Fragment key={client.id}>
                  <SidebarHeader>{client.query.app}</SidebarHeader>
                  {plugins
                    .sort((a: typeof FlipperPlugin, b: typeof FlipperPlugin) =>
                      client.byClientLRU(plugins.length, a, b),
                    )
                    .slice(
                      0,
                      client.showAllPlugins
                        ? client.plugins.length
                        : minShowPluginsCount,
                    )
                    .map((plugin: typeof FlipperPlugin) => (
                      <PluginSidebarListItem
                        key={plugin.id}
                        isActive={
                          plugin.id === selectedPlugin &&
                          selectedApp === client.id
                        }
                        onClick={() =>
                          selectPlugin({
                            selectedPlugin: plugin.id,
                            selectedApp: client.id,
                            deepLinkPayload: null,
                          })
                        }
                        plugin={plugin}
                        app={client.query.app}
                      />
                    ))}
                  {plugins.length > minShowPluginsCount && (
                    <PluginShowMoreOrLess
                      onClick={() =>
                        this.props.showMoreOrLessPlugins(client.id)
                      }>
                      {client.showAllPlugins ? 'Show less' : 'Show more'}
                    </PluginShowMoreOrLess>
                  )}
                </React.Fragment>
              );
            })}
          {uninitializedClients.map(entry => (
            <React.Fragment key={JSON.stringify(entry.client)}>
              <SidebarHeader>{entry.client.appName}</SidebarHeader>
              {entry.errorMessage ? (
                <ErrorIndicator name={'mobile-cross'} size={16} />
              ) : (
                <Spinner size={16} />
              )}
            </React.Fragment>
          ))}
        </Plugins>
        <PluginDebugger
          onClick={() => this.props.setActiveSheet(ACTIVE_SHEET_PLUGINS)}>
          <Glyph
            name="question-circle"
            size={16}
            variant="outline"
            color={colors.blackAlpha30}
          />
          &nbsp;Manage Plugins...
        </PluginDebugger>
        {config.showLogin && <UserAccount />}
      </Sidebar>
    );
  }
}

export default connect<StateFromProps, DispatchFromProps, OwnProps, Store>(
  ({
    application: {windowIsFocused},
    connections: {
      selectedDevice,
      selectedPlugin,
      selectedApp,
      clients,
      uninitializedClients,
      staticView,
    },
    notifications: {activeNotifications, blacklistedPlugins},
    plugins: {devicePlugins, clientPlugins},
  }) => ({
    numNotifications: (() => {
      const blacklist = new Set(blacklistedPlugins);
      return activeNotifications.filter(
        (n: PluginNotification) => !blacklist.has(n.pluginId),
      ).length;
    })(),
    windowIsFocused,
    selectedDevice,
    staticView,
    selectedPlugin,
    selectedApp,
    clients,
    uninitializedClients,
    devicePlugins,
    clientPlugins,
  }),
  {
    selectPlugin,
    setStaticView,
    setActiveSheet,
    showMoreOrLessPlugins,
  },
)(MainSidebar);
