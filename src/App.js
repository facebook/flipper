/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import {FlexColumn, FlexRow} from 'sonar';
import {connect} from 'react-redux';
import {toggleBugDialogVisible} from './reducers/application.js';
import WelcomeScreen from './chrome/WelcomeScreen.js';
import SonarTitleBar from './chrome/SonarTitleBar.js';
import BaseDevice from './devices/BaseDevice.js';
import MainSidebar from './chrome/MainSidebar.js';
import {SonarBasePlugin} from './plugin.js';
import Server from './server.js';
import Client from './Client.js';
import React from 'react';
import BugReporter from './fb-stubs/BugReporter.js';
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
};

type Props = {
  devices: Array<BaseDevice>,
  leftSidebarVisible: boolean,
  bugDialogVisible: boolean,
  pluginManagerVisible: boolean,
  selectedDeviceIndex: number,
  selectedApp: ?string,
  toggleBugDialogVisible: (visible?: boolean) => void,
};

export class App extends React.Component<Props, State> {
  constructor() {
    performance.mark('init');
    super();
    this.initTracking();

    setupEnvironment();
    this.logger = new Logger();
    replaceGlobalConsole(this.logger);
    this.server = this.initServer();

    this.state = {
      activeAppKey: null,
      activePluginKey: null,
      error: null,
      devices: {},
      plugins: {},
    };

    this.bugReporter = new BugReporter(this.logger);
    this.commandLineArgs = yargs.parse(electron.remote.process.argv);
  }

  server: Server;
  bugReporter: BugReporter;
  logger: Logger;
  commandLineArgs: Object;
  _hasActivatedPreferredPlugin: boolean = false;

  componentDidMount() {
    this.logger.trackTimeSince('init');

    // close socket before reloading
    window.addEventListener('beforeunload', () => {
      this.server.close();
    });
  }

  toJSON() {
    return null;
  }

  initServer(): Server {
    const server = new Server(this);
    server.addListener('new-client', client => {
      client.addListener('close', () => {
        this.setState(state => {
          this.forceUpdate();
          // TODO:
          //reducers.TeardownClient(this, state, {appKey: client.id}),
        });
        if (this.state.activeAppKey === client.id) {
          this.forceUpdate();
        }
      });

      client.addListener('plugins-change', () => {
        this.forceUpdate();
      });
    });

    server.addListener('clients-change', () => {
      this.forceUpdate();
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

  getDevice = (id: string): ?BaseDevice =>
    this.props.devices.find((device: BaseDevice) => device.serial === id);

  getClient(appKey: ?string): ?Client {
    if (appKey == null) {
      return null;
    }

    const info = this.server.connections.get(appKey);
    if (info != null) {
      return info.client;
    }
  }

  render() {
    return (
      <FlexColumn fill={true}>
        <SonarTitleBar />
        {this.props.bugDialogVisible && (
          <BugReporterDialog
            bugReporter={this.bugReporter}
            close={() => this.props.toggleBugDialogVisible(false)}
          />
        )}
        {this.props.selectedDeviceIndex > -1 ? (
          <FlexRow fill={true}>
            {this.props.leftSidebarVisible && (
              <MainSidebar
                clients={Array.from(this.server.connections.values()).map(
                  ({client}) => client,
                )}
              />
            )}
            <PluginContainer
              logger={this.logger}
              client={this.getClient(this.props.selectedApp)}
            />
          </FlexRow>
        ) : this.props.pluginManagerVisible ? (
          <PluginManager />
        ) : (
          <WelcomeScreen />
        )}
        <ErrorBar text={this.state.error} />
      </FlexColumn>
    );
  }
}

export default connect(
  ({
    application: {pluginManagerVisible, bugDialogVisible, leftSidebarVisible},
    connections: {devices, selectedDeviceIndex, selectedApp},
  }) => ({
    pluginManagerVisible,
    bugDialogVisible,
    leftSidebarVisible,
    devices,
    selectedDeviceIndex,
    selectedApp,
  }),
  {toggleBugDialogVisible},
)(App);

function replaceGlobalConsole(logger: Logger) {
  const loggerMethods = {
    log: logger.info,
    warn: logger.warn,
    error: logger.error,
  };
  const consoleHandler = {
    get: function(obj, prop) {
      return prop in loggerMethods
        ? args => {
            obj[prop] && obj[prop](args);
            return loggerMethods[prop].bind(logger)(args);
          }
        : obj[prop];
    },
  };
  window.console = new Proxy(console, consoleHandler);
}

function setupEnvironment() {
  if (!process.env.ANDROID_HOME) {
    process.env.ANDROID_HOME = '/opt/android_sdk';
  }
}
