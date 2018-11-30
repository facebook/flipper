/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import type {FlipperPlugin, FlipperDevicePlugin} from './plugin.js';
import type LogManager from './fb-stubs/Logger';
import BaseDevice from './devices/BaseDevice.js';
import type {Props as PluginProps} from './plugin';

import Client from './Client.js';
import {
  ErrorBoundary,
  Component,
  FlexColumn,
  FlexRow,
  colors,
  styled,
} from 'flipper';
import React from 'react';
import {connect} from 'react-redux';
import {setPluginState} from './reducers/pluginStates.js';
import {selectPlugin} from './reducers/connections';
import NotificationsHub from './NotificationsHub';
import {activateMenuItems} from './MenuBar.js';

const Container = styled(FlexColumn)({
  width: 0,
  flexGrow: 1,
  flexShrink: 1,
  backgroundColor: colors.white,
});

const SidebarContainer = styled(FlexRow)({
  backgroundColor: colors.light02,
  height: '100%',
  overflow: 'scroll',
});

type Props = {
  logger: LogManager,
  selectedDevice: BaseDevice,
  selectedPlugin: ?string,
  selectedApp: ?string,
  pluginStates: {
    [pluginKey: string]: Object,
  },
  clients: Array<Client>,
  setPluginState: (payload: {
    pluginKey: string,
    state: Object,
  }) => void,
  deepLinkPayload: ?string,
  selectPlugin: (payload: {|
    selectedPlugin: ?string,
    selectedApp?: ?string,
    deepLinkPayload: ?string,
  |}) => mixed,
  devicePlugins: Map<string, Class<FlipperDevicePlugin<>>>,
  clientPlugins: Map<string, Class<FlipperPlugin<>>>,
};

type State = {
  activePlugin: ?Class<FlipperPlugin<> | FlipperDevicePlugin<>>,
  target: Client | BaseDevice | null,
  pluginKey: string,
};

class PluginContainer extends Component<Props, State> {
  static getDerivedStateFromProps(props: Props): State {
    const {selectedPlugin} = props;
    let pluginKey = 'unknown';
    let target = null;
    let activePlugin: ?Class<FlipperPlugin<> | FlipperDevicePlugin<>> = null;

    if (selectedPlugin) {
      if (selectedPlugin === NotificationsHub.id) {
        activePlugin = NotificationsHub;
      } else if (props.selectedPlugin) {
        activePlugin = props.devicePlugins.get(props.selectedPlugin);
      }
      target = props.selectedDevice;
      if (activePlugin) {
        pluginKey = `${props.selectedDevice.serial}#${activePlugin.id}`;
      } else {
        target = props.clients.find(
          (client: Client) => client.id === props.selectedApp,
        );
        activePlugin = props.clientPlugins.get(selectedPlugin);
        if (!activePlugin || !target) {
          throw new Error(
            `Plugin "${props.selectedPlugin || ''}" could not be found.`,
          );
        }
        pluginKey = `${target.id}#${activePlugin.id}`;
      }
    }

    return {
      activePlugin,
      target,
      pluginKey,
    };
  }

  state: State = this.constructor.getDerivedStateFromProps(this.props);
  plugin: ?FlipperPlugin<> | FlipperDevicePlugin<>;

  refChanged = (ref: ?FlipperPlugin<> | FlipperDevicePlugin<>) => {
    if (this.plugin) {
      this.plugin._teardown();
      this.plugin = null;
    }
    const {target} = this.state;
    if (ref && target) {
      activateMenuItems(ref);
      ref._init();
      this.props.logger.trackTimeSince(`activePlugin-${ref.constructor.id}`);
      this.plugin = ref;
    }
  };

  render() {
    const {pluginStates, setPluginState} = this.props;
    const {activePlugin, pluginKey, target} = this.state;

    if (!activePlugin || !target) {
      return null;
    }
    const props: PluginProps<Object> = {
      key: pluginKey,
      logger: this.props.logger,
      persistedState: activePlugin.defaultPersistedState
        ? {
            ...activePlugin.defaultPersistedState,
            ...pluginStates[pluginKey],
          }
        : pluginStates[pluginKey],
      setPersistedState: state => setPluginState({pluginKey, state}),
      target,
      deepLinkPayload: this.props.deepLinkPayload,
      selectPlugin: (pluginID: string, deepLinkPayload: ?string) => {
        const {target} = this.state;
        // check if plugin will be available
        if (
          target instanceof Client &&
          target.plugins.some(p => p === pluginID)
        ) {
          this.props.selectPlugin({selectedPlugin: pluginID, deepLinkPayload});
          return true;
        } else if (target instanceof BaseDevice) {
          this.props.selectPlugin({selectedPlugin: pluginID, deepLinkPayload});
          return true;
        } else {
          return false;
        }
      },
      ref: this.refChanged,
    };

    return (
      <React.Fragment>
        <Container key="plugin">
          <ErrorBoundary
            heading={`Plugin "${
              activePlugin.title
            }" encountered an error during render`}
            logger={this.props.logger}>
            {React.createElement(activePlugin, props)}
          </ErrorBoundary>
        </Container>
        <SidebarContainer id="detailsSidebar" />
      </React.Fragment>
    );
  }
}

/* $FlowFixMe(>=0.86.0) This
 * comment suppresses an error found when Flow v0.86 was
 * deployed. To see the error, delete this comment and
 * run Flow. */
export default connect(
  ({
    application: {rightSidebarVisible, rightSidebarAvailable},
    connections: {
      selectedPlugin,
      selectedDevice,
      selectedApp,
      clients,
      deepLinkPayload,
    },
    pluginStates,
    plugins: {devicePlugins, clientPlugins},
  }) => ({
    selectedPlugin,
    selectedDevice,
    pluginStates,
    selectedApp,
    clients,
    deepLinkPayload,
    devicePlugins,
    clientPlugins,
  }),
  {
    setPluginState,
    selectPlugin,
  },
)(PluginContainer);
