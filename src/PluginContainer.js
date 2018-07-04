/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import type {SonarPlugin, SonarBasePlugin} from './plugin.js';
import type LogManager from './fb-stubs/Logger';
import type Client from './Client.js';
import type BaseDevice from './devices/BaseDevice.js';
import type {Props as PluginProps} from './plugin.js';

import {SonarDevicePlugin} from './plugin.js';
import {ErrorBoundary, Component, FlexColumn, FlexRow, colors} from 'sonar';
import React from 'react';
import {connect} from 'react-redux';
import {setPluginState} from './reducers/pluginStates.js';
import {devicePlugins} from './device-plugins/index.js';
import plugins from './plugins/index.js';
import {activateMenuItems} from './MenuBar.js';

const Container = FlexColumn.extends({
  width: 0,
  flexGrow: 1,
  flexShrink: 1,
  backgroundColor: colors.white,
});

const SidebarContainer = FlexRow.extends({
  backgroundColor: colors.light02,
  height: '100%',
  overflow: 'scroll',
});

type Props = {
  logger: LogManager,
  selectedDeviceIndex: number,
  selectedPlugin: ?string,
  selectedApp: ?string,
  pluginStates: Object,
  clients: Array<Client>,
  devices: Array<BaseDevice>,
  setPluginState: (payload: {
    pluginKey: string,
    state: Object,
  }) => void,
};

type State = {
  activePlugin: ?Class<SonarBasePlugin<>>,
  target: Client | BaseDevice | null,
  pluginKey: string,
};

function withPluginLifecycleHooks(
  PluginComponent: Class<SonarBasePlugin<>>,
  target: Client | BaseDevice,
) {
  return class extends React.Component<PluginProps<any>> {
    plugin: ?SonarBasePlugin<>;

    static displayName = `${PluginComponent.title}Plugin`;

    componentDidMount() {
      const {plugin} = this;
      if (plugin) {
        activateMenuItems(plugin);
        plugin._setup(target);
        plugin._init();
      }
    }

    componentWillUnmount() {
      if (this.plugin) {
        this.plugin._teardown();
      }
    }

    render() {
      return (
        <PluginComponent
          ref={(ref: ?SonarBasePlugin<>) => {
            if (ref) {
              this.plugin = ref;
            }
          }}
          {...this.props}
        />
      );
    }
  };
}

class PluginContainer extends Component<Props, State> {
  static getDerivedStateFromProps(props: Props) {
    let activePlugin = devicePlugins.find(
      (p: Class<SonarDevicePlugin<>>) => p.id === props.selectedPlugin,
    );
    const device: BaseDevice = props.devices[props.selectedDeviceIndex];
    let target = device;
    let pluginKey = 'unknown';
    if (activePlugin) {
      pluginKey = `${device.serial}#${activePlugin.id}`;
    } else {
      target = props.clients.find(
        (client: Client) => client.id === props.selectedApp,
      );
      activePlugin = plugins.find(
        (p: Class<SonarPlugin<>>) => p.id === props.selectedPlugin,
      );
      if (!activePlugin || !target) {
        return null;
      }
      pluginKey = `${target.id}#${activePlugin.id}`;
    }

    return {
      pluginKey,
      activePlugin,
      target,
    };
  }

  state = {
    pluginKey: 'unknown',
    activePlugin: null,
    target: null,
  };

  render() {
    const {pluginStates, setPluginState} = this.props;
    const {activePlugin, pluginKey, target} = this.state;

    if (!activePlugin || !target) {
      return null;
    }

    return (
      // $FlowFixMe: Flow doesn't know of React.Fragment yet
      <React.Fragment>
        <Container key="plugin">
          <ErrorBoundary
            heading={`Plugin "${
              activePlugin.title
            }" encountered an error during render`}
            logger={this.props.logger}>
            {React.createElement(
              withPluginLifecycleHooks(activePlugin, target),
              {
                key: pluginKey,
                logger: this.props.logger,
                persistedState: pluginStates[pluginKey],
                setPersistedState: state => setPluginState({pluginKey, state}),
              },
            )}
          </ErrorBoundary>
        </Container>
        <SidebarContainer id="sonarSidebar" />
      </React.Fragment>
    );
  }
}

export default connect(
  ({
    application: {rightSidebarVisible, rightSidebarAvailable},
    connections: {selectedPlugin, devices, selectedDeviceIndex, selectedApp},
    pluginStates,
    server: {clients},
  }) => ({
    selectedPlugin,
    devices,
    selectedDeviceIndex,
    pluginStates,
    selectedApp,
    clients,
  }),
  {
    setPluginState,
  },
)(PluginContainer);
