/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import {
  FlipperPlugin,
  FlipperDevicePlugin,
  Props as PluginProps,
} from './plugin';
import {Logger} from './fb-interfaces/Logger';
import BaseDevice from './devices/BaseDevice';
import {pluginKey as getPluginKey} from './reducers/pluginStates';
import Client from './Client';
import {
  ErrorBoundary,
  FlexColumn,
  FlexRow,
  colors,
  styled,
  ArchivedDevice,
} from 'flipper';
import React, {PureComponent} from 'react';
import {connect} from 'react-redux';
import {setPluginState} from './reducers/pluginStates';
import {selectPlugin} from './reducers/connections';
import {State as Store} from './reducers/index';
import NotificationsHub from './NotificationsHub';
import {activateMenuItems} from './MenuBar';

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

type OwnProps = {
  logger: Logger;
};

type StateFromProps = {
  pluginState: Object;
  activePlugin: typeof FlipperPlugin | typeof FlipperDevicePlugin;
  target: Client | BaseDevice | null;
  pluginKey: string | null | undefined;
  deepLinkPayload: string | null | undefined;
  selectedApp: string | null | undefined;
  isArchivedDevice: boolean;
};

type DispatchFromProps = {
  selectPlugin: (payload: {
    selectedPlugin: string | null | undefined;
    selectedApp?: string | null | undefined;
    deepLinkPayload: string | null | undefined;
  }) => any;
  setPluginState: (payload: {
    pluginKey: string;
    state: Partial<Object>;
  }) => void;
};

type Props = StateFromProps & DispatchFromProps & OwnProps;

class PluginContainer extends PureComponent<Props> {
  plugin:
    | FlipperPlugin<any, any, any>
    | FlipperDevicePlugin<any, any, any>
    | null
    | undefined;

  refChanged = (
    ref:
      | FlipperPlugin<any, any, any>
      | FlipperDevicePlugin<any, any, any>
      | null
      | undefined,
  ) => {
    if (this.plugin) {
      this.plugin._teardown();
      this.plugin = null;
    }
    if (ref && this.props.target) {
      activateMenuItems(ref);
      ref._init();
      this.props.logger.trackTimeSince(`activePlugin-${ref.constructor.id}`);
      this.plugin = ref;
    }
  };

  componentWillUnmount() {
    if (this.plugin) {
      this.plugin._teardown();
      this.plugin = null;
    }
  }

  render() {
    const {
      pluginState,
      setPluginState,
      activePlugin,
      pluginKey,
      target,
      isArchivedDevice,
      selectedApp,
    } = this.props;
    if (!activePlugin || !target || !pluginKey) {
      console.warn(`No selected plugin. Rendering empty!`);
      return null;
    }
    const props: PluginProps<Object> & {
      key: string;
      ref: (
        ref:
          | FlipperPlugin<any, any, any>
          | FlipperDevicePlugin<any, any, any>
          | null
          | undefined,
      ) => void;
    } = {
      key: pluginKey,
      logger: this.props.logger,
      selectedApp,
      persistedState: activePlugin.defaultPersistedState
        ? {
            ...activePlugin.defaultPersistedState,
            ...pluginState,
          }
        : pluginState,
      setPersistedState: state => setPluginState({pluginKey, state}),
      target,
      deepLinkPayload: this.props.deepLinkPayload,
      selectPlugin: (
        pluginID: string,
        deepLinkPayload: string | null | undefined,
      ) => {
        const {target} = this.props;
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
      isArchivedDevice,
    };
    return (
      <React.Fragment>
        <Container key="plugin">
          <ErrorBoundary
            heading={`Plugin "${activePlugin.title ||
              'Unknown'}" encountered an error during render`}>
            {React.createElement(activePlugin, props)}
          </ErrorBoundary>
        </Container>
        <SidebarContainer id="detailsSidebar" />
      </React.Fragment>
    );
  }
}

export default connect<StateFromProps, DispatchFromProps, OwnProps, Store>(
  ({
    connections: {
      selectedPlugin,
      selectedDevice,
      selectedApp,
      clients,
      deepLinkPayload,
    },
    pluginStates,
    plugins: {devicePlugins, clientPlugins},
  }) => {
    let pluginKey = null;
    let target = null;
    let activePlugin:
      | typeof FlipperDevicePlugin
      | typeof FlipperPlugin
      | null = null;

    if (selectedPlugin) {
      if (selectedPlugin === NotificationsHub.id) {
        activePlugin = NotificationsHub;
      } else if (selectedPlugin) {
        activePlugin = devicePlugins.get(selectedPlugin);
      }
      target = selectedDevice;
      if (activePlugin) {
        pluginKey = getPluginKey(selectedDevice.serial, activePlugin.id);
      } else {
        target = clients.find((client: Client) => client.id === selectedApp);
        activePlugin = clientPlugins.get(selectedPlugin);
        if (activePlugin && target) {
          pluginKey = getPluginKey(target.id, activePlugin.id);
        }
      }
    }
    const isArchivedDevice = !selectedDevice
      ? false
      : selectedDevice instanceof ArchivedDevice;

    return {
      pluginState: pluginStates[pluginKey],
      activePlugin,
      target,
      deepLinkPayload,
      pluginKey,
      isArchivedDevice,
      selectedApp,
    };
  },
  {
    setPluginState,
    selectPlugin,
  },
)(PluginContainer);
