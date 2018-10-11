/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import type {FlipperPlugin, FlipperBasePlugin} from './plugin.js';
import type LogManager from './fb-stubs/Logger';
import type BaseDevice from './devices/BaseDevice.js';
import type {Props as PluginProps} from './plugin';

import {FlipperDevicePlugin} from './plugin.js';
import {
  ErrorBoundary,
  Component,
  FlexColumn,
  FlexRow,
  colors,
  styled,
} from 'flipper';
import React from 'react';
import Client from './Client.js';
import {connect} from 'react-redux';
import {setPluginState} from './reducers/pluginStates.js';
import {setActiveNotifications} from './reducers/notifications.js';
import {devicePlugins, clientPlugins} from './plugins/index.js';
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
};

type State = {
  activePlugin: ?Class<FlipperBasePlugin<>>,
  target: Client | BaseDevice | null,
  pluginKey: string,
};

function computeState(props: Props): State {
  // plugin changed
  let activePlugin = devicePlugins.find(
    (p: Class<FlipperDevicePlugin<>>) => p.id === props.selectedPlugin,
  );
  let target = props.selectedDevice;
  let pluginKey = 'unknown';
  if (activePlugin) {
    pluginKey = `${props.selectedDevice.serial}#${activePlugin.id}`;
  } else {
    target = props.clients.find(
      (client: Client) => client.id === props.selectedApp,
    );
    activePlugin = clientPlugins.find(
      (p: Class<FlipperPlugin<>>) => p.id === props.selectedPlugin,
    );
    if (!activePlugin || !target) {
      throw new Error(
        `Plugin "${props.selectedPlugin || ''}" could not be found.`,
      );
    }
    pluginKey = `${target.id}#${activePlugin.id}`;
  }

  return {
    activePlugin,
    target,
    pluginKey,
  };
}

class PluginContainer extends Component<Props, State> {
  plugin: ?FlipperBasePlugin<>;

  constructor(props: Props) {
    super();
    this.state = computeState(props);
  }

  componentWillReceiveProps(nextProps: Props) {
    if (
      nextProps.selectedDevice !== this.props.selectedDevice ||
      nextProps.selectedApp !== this.props.selectedApp ||
      nextProps.selectedPlugin !== this.props.selectedPlugin
    ) {
      this.setState(computeState(nextProps));
    }
  }

  refChanged = (ref: ?FlipperBasePlugin<>) => {
    if (this.plugin) {
      this.plugin._teardown();
      this.plugin = null;
    }
    const {target} = this.state;
    if (ref && target) {
      activateMenuItems(ref);
      ref._init();
      if (target instanceof Client) {
        target.readBufferedMessages(ref.constructor.id);
      }
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
      persistedState: pluginStates[pluginKey] || {},
      setPersistedState: state => {
        // We are using setTimout here to wait for previous state updated to
        // finish before triggering a new state update. Otherwise this can
        // cause race conditions, with multiple state updates happening at the
        // same time.
        setTimeout(() => setPluginState({pluginKey, state}), 0);
      },
      target,
      deepLinkPayload: this.props.deepLinkPayload,
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
  }) => ({
    selectedPlugin,
    selectedDevice,
    pluginStates,
    selectedApp,
    clients,
    deepLinkPayload,
  }),
  {
    setPluginState,
    setActiveNotifications,
  },
)(PluginContainer);
