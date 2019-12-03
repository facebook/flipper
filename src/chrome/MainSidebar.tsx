/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import config from '../fb-stubs/config';
import BaseDevice from '../devices/BaseDevice';
import Client from '../Client';
import {UninitializedClient} from '../UninitializedClient';
import {FlipperBasePlugin, sortPluginsByName} from '../plugin';
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
  Button,
  StarButton,
  Heading,
  Spacer,
  ArchivedDevice,
  SmallText,
  Info,
} from 'flipper';
import React, {Component, PureComponent, Fragment} from 'react';
import NotificationsHub from '../NotificationsHub';
import {
  selectPlugin,
  starPlugin,
  StaticView,
  setStaticView,
  selectClient,
  getAvailableClients,
  getClientById,
} from '../reducers/connections';
import {setActiveSheet} from '../reducers/application';
import UserAccount from './UserAccount';
import {connect} from 'react-redux';
import {BackgroundColorProperty} from 'csstype';
import {StyledOtherComponent} from 'create-emotion-styled';
import SupportRequestFormManager from '../fb-stubs/SupportRequestFormManager';
import SupportRequestDetails from '../fb-stubs/SupportRequestDetails';
import SupportRequestFormV2 from '../fb-stubs/SupportRequestFormV2';

type FlipperPlugins = typeof FlipperPlugin[];
type PluginsByCategory = [string, FlipperPlugins][];

const ListItem = styled('div')(({active}: {active?: boolean}) => ({
  paddingLeft: 10,
  display: 'flex',
  alignItems: 'center',
  marginBottom: 6,
  flexShrink: 0,
  backgroundColor: active ? colors.macOSTitleBarIconSelected : 'none',
  color: active ? colors.white : colors.macOSSidebarSectionItem,
  lineHeight: '25px',
  padding: '0 10px',
  '&[disabled]': {
    color: 'rgba(0, 0, 0, 0.5)',
  },
}));

const SidebarButton = styled(Button)(({small}: {small?: boolean}) => ({
  fontWeight: 'bold',
  fontSize: small ? 11 : 14,
  width: '100%',
  overflow: 'hidden',
  marginTop: small ? 0 : 20,
  pointer: 'cursor',
  border: 'none',
  background: 'none',
  padding: 0,
  justifyContent: 'left',
  whiteSpace: 'nowrap',
}));

const PluginShape = styled(FlexBox)(
  ({backgroundColor}: {backgroundColor?: BackgroundColorProperty}) => ({
    marginRight: 8,
    backgroundColor,
    borderRadius: 3,
    flexShrink: 0,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    top: '-1px',
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

const CategoryName = styled(PluginName)({
  color: colors.macOSSidebarSectionTitle,
  textTransform: 'uppercase',
  fontSize: '0.9em',
});

const Plugins = styled(FlexColumn)({
  flexGrow: 1,
  overflow: 'auto',
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
  helpRef?: any;
  provided?: any;
  onFavorite?: () => void;
  starred?: boolean;
}> {
  render() {
    const {isActive, plugin, onFavorite, starred} = this.props;
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
        {starred !== undefined && (
          <StarButton onStar={onFavorite!} starred={starred} />
        )}
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
  starredPlugins: Store['connections']['starredPlugins'];
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
  selectClient: typeof selectClient;
  setActiveSheet: (activeSheet: ActiveSheet) => void;
  setStaticView: (payload: StaticView) => void;
  starPlugin: typeof starPlugin;
};

type Props = OwnProps & StateFromProps & DispatchFromProps;
type State = {
  showSupportForm: boolean;
  showAllPlugins: boolean;
};
class MainSidebar extends PureComponent<Props, State> {
  state: State = {
    showSupportForm: GK.get('support_requests_v2'),
    showAllPlugins: false,
  };
  static getDerivedStateFromProps(props: Props, state: State) {
    if (
      !state.showSupportForm &&
      props.staticView === SupportRequestFormManager
    ) {
      // Show SupportForm option even when GK is false and support form is shown.
      // That means the user has used deeplink to open support form.
      // Once the variable is true, it will be true for the whole session.
      return {showSupportForm: true};
    }
    return state;
  }

  render() {
    const {
      selectedDevice,
      selectClient,
      selectedPlugin,
      selectedApp,
      staticView,
      selectPlugin,
      setStaticView,
      numNotifications,
      uninitializedClients,
    } = this.props;
    const clients = getAvailableClients(selectedDevice, this.props.clients);
    const client: Client | undefined = getClientById(clients, selectedApp);

    return (
      <Sidebar position="left" width={200} backgroundColor={colors.light02}>
        <Plugins>
          {selectedDevice ? (
            <>
              <ListItem>
                <SidebarButton>{selectedDevice.title}</SidebarButton>
              </ListItem>
              {this.showArchivedDeviceDetails(selectedDevice)}
              {selectedDevice.devicePlugins.map(pluginName => {
                const plugin = this.props.devicePlugins.get(pluginName)!;
                return (
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
                );
              })}
              <ListItem>
                <SidebarButton
                  title="Select an app to see available plugins"
                  compact={true}
                  dropdown={clients.map(c => ({
                    checked: client === c,
                    label: c.query.app,
                    type: 'checkbox',
                    click: () => selectClient(c.id),
                  }))}>
                  {clients.length === 0 ? (
                    <>
                      <Glyph
                        name="mobile-engagement"
                        size={16}
                        color={colors.red}
                        style={{marginRight: 10}}
                      />
                      No clients connected
                    </>
                  ) : !client ? (
                    'Select client'
                  ) : (
                    <>
                      {client.query.app}
                      <Glyph
                        size={12}
                        name="chevron-down"
                        style={{marginLeft: 8}}
                      />
                    </>
                  )}
                </SidebarButton>
              </ListItem>
              {this.renderClientPlugins(client)}
              {uninitializedClients.map(entry => (
                <ListItem key={JSON.stringify(entry.client)}>
                  {entry.client.appName}
                  {entry.errorMessage ? (
                    <ErrorIndicator name={'mobile-cross'} size={16} />
                  ) : (
                    <Spinner size={16} />
                  )}
                </ListItem>
              ))}
            </>
          ) : (
            <ListItem
              style={{
                textAlign: 'center',
                marginTop: 50,
                flexDirection: 'column',
              }}>
              <Glyph name="mobile" size={32} color={colors.red}></Glyph>
              <Spacer style={{height: 20}} />
              <Heading>Select a device to get started</Heading>
            </ListItem>
          )}
        </Plugins>
        {!GK.get('flipper_disable_notifications') && (
          <ListItem
            active={selectedPlugin === 'notifications'}
            onClick={() =>
              selectPlugin({
                selectedPlugin: 'notifications',
                selectedApp: null,
                deepLinkPayload: null,
              })
            }
            style={{
              borderTop: `1px solid ${colors.blackAlpha10}`,
            }}>
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
        {this.state.showSupportForm &&
          (function() {
            const active = staticView && staticView === SupportRequestFormV2;
            return (
              <ListItem
                active={active}
                onClick={() => setStaticView(SupportRequestFormV2)}>
                <PluginIcon
                  color={colors.light50}
                  name={'app-dailies'}
                  isActive={active}
                />
                <PluginName isActive={active}>Litho Support Request</PluginName>
              </ListItem>
            );
          })()}
        <ListItem
          onClick={() => this.props.setActiveSheet(ACTIVE_SHEET_PLUGINS)}>
          <PluginIcon
            name="question-circle"
            color={colors.light50}
            isActive={false}
          />
          Manage Plugins
        </ListItem>
        {config.showLogin && <UserAccount />}
      </Sidebar>
    );
  }

  showArchivedDeviceDetails(selectedDevice: BaseDevice) {
    if (!selectedDevice.isArchived || !selectedDevice.source) {
      return null;
    }
    const {staticView, setStaticView} = this.props;
    return (
      <>
        <ListItem>
          <Info type="warning" small>
            {selectedDevice.source ? 'Imported device' : 'Archived device'}
          </Info>
        </ListItem>
        {this.state.showSupportForm &&
          (selectedDevice as ArchivedDevice).supportRequestDetails && (
            <ListItem
              active={
                staticView != null && staticView === SupportRequestDetails
              }
              onClick={() => setStaticView(SupportRequestDetails)}>
              <PluginIcon
                color={colors.light50}
                name={'app-dailies'}
                isActive={
                  staticView != null && staticView === SupportRequestDetails
                }
              />
              <PluginName
                isActive={
                  staticView != null && staticView === SupportRequestDetails
                }>
                Support Request Details
              </PluginName>
            </ListItem>
          )}
      </>
    );
  }

  renderPluginsByCategory(
    client: Client,
    plugins: FlipperPlugins,
    starred: boolean,
    onFavorite: (pluginId: string) => void,
  ) {
    const {selectedPlugin, selectedApp, selectPlugin} = this.props;
    return groupPluginsByCategory(plugins).map(([category, plugins]) => (
      <Fragment key={category}>
        {category && (
          <ListItem>
            <CategoryName>{category}</CategoryName>
          </ListItem>
        )}
        {plugins.map(plugin => (
          <PluginSidebarListItem
            key={plugin.id}
            isActive={plugin.id === selectedPlugin && selectedApp === client.id}
            onClick={() =>
              selectPlugin({
                selectedPlugin: plugin.id,
                selectedApp: client.id,
                deepLinkPayload: null,
              })
            }
            plugin={plugin}
            app={client.query.app}
            onFavorite={() => onFavorite(plugin.id)}
            starred={starred}
          />
        ))}
      </Fragment>
    ));
  }

  renderClientPlugins(client?: Client) {
    if (!client) {
      return null;
    }
    const onFavorite = (plugin: string) => {
      this.props.starPlugin({
        selectedApp: client.id,
        selectedPlugin: plugin,
      });
    };
    const allPlugins = Array.from(this.props.clientPlugins.values()).filter(
      (p: typeof FlipperPlugin) => client.plugins.indexOf(p.id) > -1,
    );
    const favoritePlugins: FlipperPlugins = getFavoritePlugins(
      allPlugins,
      this.props.starredPlugins,
      true,
    );
    const showAllPlugins =
      this.state.showAllPlugins ||
      favoritePlugins.length === 0 ||
      // If the plugin is part of the hidden section, make sure sidebar is expanded
      (client.plugins.includes(this.props.selectedPlugin!) &&
        !favoritePlugins.find(
          plugin => plugin.id === this.props.selectedPlugin,
        ));
    return (
      <>
        {favoritePlugins.length === 0 ? (
          <ListItem>
            <SmallText center>Star your favorite plugins!</SmallText>
          </ListItem>
        ) : (
          <>
            {this.renderPluginsByCategory(
              client,
              favoritePlugins,
              true,
              onFavorite,
            )}
            <ListItem>
              <SidebarButton
                small
                compact
                onClick={() =>
                  this.setState(state => ({
                    ...state,
                    showAllPlugins: !state.showAllPlugins,
                  }))
                }>
                {showAllPlugins ? 'Show less' : 'Show more'}
                <Glyph
                  size={8}
                  name={showAllPlugins ? 'chevron-up' : 'chevron-down'}
                  style={{
                    marginLeft: 4,
                  }}
                />
              </SidebarButton>
            </ListItem>
          </>
        )}
        <div
          style={{
            flex: 'auto' /*scroll this region, not the entire thing*/,
            overflow: 'auto',
            height: 'auto',
          }}>
          {showAllPlugins
            ? this.renderPluginsByCategory(
                client,
                getFavoritePlugins(
                  allPlugins,
                  this.props.starredPlugins,
                  false,
                ),
                false,
                onFavorite,
              )
            : null}
        </div>
      </>
    );
  }
}

function getFavoritePlugins(
  allPlugins: FlipperPlugins,
  starredPlugins: Props['starredPlugins'],
  favorite: boolean,
): FlipperPlugins {
  return allPlugins.filter(plugin => {
    const idx = starredPlugins.indexOf(plugin.id);
    return idx === -1 ? !favorite : favorite;
  });
}

function groupPluginsByCategory(plugins: FlipperPlugins): PluginsByCategory {
  const sortedPlugins = plugins.slice().sort(sortPluginsByName);
  const byCategory: {[cat: string]: FlipperPlugins} = {};
  const res: PluginsByCategory = [];
  sortedPlugins.forEach(plugin => {
    const category = plugin.category || '';
    (byCategory[category] || (byCategory[category] = [])).push(plugin);
  });
  // Sort categories
  Object.keys(byCategory)
    .sort()
    .forEach(category => {
      res.push([category, byCategory[category]]);
    });
  return res;
}

export default connect<StateFromProps, DispatchFromProps, OwnProps, Store>(
  ({
    application: {windowIsFocused},
    connections: {
      selectedDevice,
      selectedPlugin,
      selectedApp,
      starredPlugins,
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
    starredPlugins,
    clients,
    uninitializedClients,
    devicePlugins,
    clientPlugins,
  }),
  {
    selectPlugin,
    selectClient,
    setStaticView,
    setActiveSheet,
    starPlugin,
  },
)(MainSidebar);
