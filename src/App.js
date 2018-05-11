/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import {ErrorBoundary, FlexColumn, FlexRow} from 'sonar';
import {connect} from 'react-redux';
import {toggleBugDialogVisible} from './reducers/application.js';
import {setupMenu, activateMenuItems} from './MenuBar.js';
import {devicePlugins} from './device-plugins/index.js';
import WelcomeScreen from './chrome/WelcomeScreen.js';
import SonarTitleBar from './chrome/SonarTitleBar.js';
import BaseDevice from './devices/BaseDevice.js';
import MainSidebar from './chrome/MainSidebar.js';
import {SonarBasePlugin} from './plugin.js';
import {Server, Client} from './server.js';
import * as reducers from './reducers.js';
import React from 'react';
import BugReporter from './fb-stubs/BugReporter.js';
import ErrorReporter from './fb-stubs/ErrorReporter.js';
import BugReporterDialog from './chrome/BugReporterDialog.js';
import ErrorBar from './chrome/ErrorBar.js';
import Logger from './fb-stubs/Logger.js';
import PluginContainer from './PluginContainer.js';
import PluginManager from './chrome/PluginManager.js';
const electron = require('electron');
const yargs = require('yargs');

export type {Client};

export type StatePluginInfo = {
  plugin: ?SonarBasePlugin<>,
  state: Object,
};

export type StateClientPlugins = {
  [pluginKey: string]: StatePluginInfo,
};

export type StatePlugins = {
  [appKey: string]: StateClientPlugins,
};

export type State = {
  activePluginKey: ?string,
  activeAppKey: ?string,
  plugins: StatePlugins,
  error: ?string,
  server: Server,
};

type Props = {
  devices: Array<BaseDevice>,
  leftSidebarVisible: boolean,
  bugDialogVisible: boolean,
  pluginManagerVisible: boolean,
  toggleBugDialogVisible: (visible?: boolean) => void,
};

export class App extends React.Component<Props, State> {
  constructor() {
    performance.mark('init');
    super();
    this.initTracking();

    this.logger = new Logger();

    this.state = {
      activeAppKey: null,
      activePluginKey: null,
      error: null,
      devices: {},
      plugins: {},
      server: this.initServer(),
    };

    this.errorReporter = new ErrorReporter(this.logger.scribeLogger);
    this.bugReporter = new BugReporter(this.logger);
    this.commandLineArgs = yargs.parse(electron.remote.process.argv);

    setupMenu(this.sendKeyboardAction);
  }

  errorReporter: ErrorReporter;
  bugReporter: BugReporter;
  logger: Logger;
  commandLineArgs: Object;
  _hasActivatedPreferredPlugin: boolean = false;

  componentDidMount() {
    this.logger.trackTimeSince('init');

    // close socket before reloading
    window.addEventListener('beforeunload', () => {
      this.state.server.close();
    });
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.devices !== this.props.devices) {
      this.ensurePluginSelected();
    }
  }

  toJSON() {
    return null;
  }

  initServer(): Server {
    const server = new Server(this);

    server.addListener('new-client', client => {
      client.addListener('close', () => {
        this.setState(state =>
          reducers.TeardownClient(this, state, {appKey: client.id}),
        );
        if (this.state.activeAppKey === client.id) {
          setTimeout(this.ensurePluginSelected);
        }
      });

      client.addListener('plugins-change', () => {
        this.setState({}, this.ensurePluginSelected);
      });
    });

    server.addListener('clients-change', () => {
      this.setState({}, this.ensurePluginSelected);
    });

    server.addListener('error', err => {
      if (err.code === 'EADDRINUSE') {
        this.setState({
          error:
            "Couldn't start websocket server. " +
            'Looks like you have multiple copies of Sonar running.',
        });
      } else {
        // unknown error
        this.setState({
          error: err.message,
        });
      }
    });

    return server;
  }

  initTracking = () => {
    electron.ipcRenderer.on('trackUsage', () => {
      // check if there's a plugin currently active
      const {activeAppKey, activePluginKey} = this.state;
      if (activeAppKey == null || activePluginKey == null) {
        return;
      }

      // app plugins
      const client = this.getClient(activeAppKey);
      if (client) {
        this.logger.track('usage', 'ping', {
          app: client.query.app,
          device: client.query.device,
          os: client.query.os,
          plugin: activePluginKey,
        });
        return;
      }

      // device plugins
      const device: ?BaseDevice = this.getDevice(activeAppKey);
      if (device) {
        this.logger.track('usage', 'ping', {
          os: device.os,
          plugin: activePluginKey,
          device: device.title,
        });
      }
    });
  };

  sendKeyboardAction = (action: string) => {
    const {activeAppKey, activePluginKey} = this.state;

    if (activeAppKey != null && activePluginKey != null) {
      const clientPlugins = this.state.plugins[activeAppKey];
      const pluginInfo = clientPlugins && clientPlugins[activePluginKey];
      const plugin = pluginInfo && pluginInfo.plugin;
      if (plugin && typeof plugin.onKeyboardAction === 'function') {
        plugin.onKeyboardAction(action);
      }
    }
  };

  getDevice = (id: string): ?BaseDevice => {
    this.props.devices.find((device: BaseDevice) => device.serial === id);
  };

  ensurePluginSelected = () => {
    // check if we need to rehydrate this client as it may have been previously active
    const {activeAppKey, activePluginKey, server} = this.state;
    const {devices} = this.props;

    if (!this._hasActivatedPreferredPlugin) {
      for (const connection of server.connections.values()) {
        const {client} = connection;
        const {plugins} = client;

        for (const plugin of plugins) {
          if (plugin !== this.commandLineArgs.plugin) {
            continue;
          }

          this._hasActivatedPreferredPlugin = true;
          this.onActivatePlugin(client.id, plugin);
          return;
        }
      }

      if (devices.length > 0) {
        const device = devices[0];
        for (const plugin of devicePlugins) {
          if (plugin.id !== this.commandLineArgs.plugin) {
            continue;
          }

          this._hasActivatedPreferredPlugin = true;
          this.onActivatePlugin(device.serial, plugin.id);
          return;
        }
      }
    }

    if (activeAppKey != null && activePluginKey != null) {
      const client = this.getClient(activeAppKey);
      if (client != null && client.plugins.includes(activePluginKey)) {
        this.onActivatePlugin(client.id, activePluginKey);
        return;
      }

      const device: ?BaseDevice = this.getDevice(activeAppKey);
      if (device != null) {
        this.onActivatePlugin(device.serial, activePluginKey);
        return;
      }
    } else {
      // No plugin selected, let's select one
      const deviceList = ((Object.values(devices): any): Array<BaseDevice>);
      if (deviceList.length > 0) {
        const device = deviceList[0];
        this.onActivatePlugin(device.serial, devicePlugins[0].id);
        return;
      }

      const connections = Array.from(server.connections.values());
      if (connections.length > 0) {
        const client = connections[0].client;
        const plugins = client.plugins;
        if (plugins.length > 0) {
          this.onActivatePlugin(client.id, client.plugins[0]);
          return;
        }
      }
    }
  };

  getClient(appKey: ?string): ?Client {
    if (appKey == null) {
      return null;
    }

    const info = this.state.server.connections.get(appKey);
    if (info != null) {
      return info.client;
    }
  }

  onActivatePlugin = (appKey: string, pluginKey: string) => {
    activateMenuItems(pluginKey);

    this.setState(state =>
      reducers.ActivatePlugin(this, state, {
        appKey,
        pluginKey,
      }),
    );
  };

  render() {
    const {state} = this;
    const hasDevices =
      this.props.devices.length > 0 || state.server.connections.size > 0;
    let mainView = null;

    const {activeAppKey, activePluginKey} = state;
    if (activeAppKey != null && activePluginKey != null) {
      const clientPlugins = state.plugins[activeAppKey];
      const pluginInfo = clientPlugins && clientPlugins[activePluginKey];
      const plugin = pluginInfo && pluginInfo.plugin;
      if (plugin) {
        mainView = this.props.pluginManagerVisible ? (
          <PluginManager />
        ) : (
          <ErrorBoundary
            heading={`Plugin "${
              plugin.constructor.title
            }" encountered an error during render`}>
            <PluginContainer
              logger={this.logger}
              plugin={plugin}
              state={plugin.state}
            />
          </ErrorBoundary>
        );
      }
    }

    return (
      <FlexColumn fill={true}>
        <SonarTitleBar />
        {this.props.bugDialogVisible && (
          <BugReporterDialog
            bugReporter={this.bugReporter}
            close={() => this.props.toggleBugDialogVisible(false)}
          />
        )}
        {hasDevices ? (
          <FlexRow fill={true}>
            {this.props.leftSidebarVisible && (
              <MainSidebar
                activePluginKey={state.activePluginKey}
                activeAppKey={state.activeAppKey}
                devices={this.props.devices}
                server={state.server}
                onActivatePlugin={this.onActivatePlugin}
              />
            )}
            {mainView}
          </FlexRow>
        ) : this.props.pluginManagerVisible ? (
          <PluginManager />
        ) : (
          <WelcomeScreen />
        )}
        <ErrorBar text={state.error} />
      </FlexColumn>
    );
  }
}

export default connect(
  ({
    application: {pluginManagerVisible, bugDialogVisible, leftSidebarVisible},
    devices,
  }) => ({
    pluginManagerVisible,
    bugDialogVisible,
    leftSidebarVisible,
    devices,
  }),
  {toggleBugDialogVisible},
)(App);
