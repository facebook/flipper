/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 * @format
 */
import {
  ThemeProvider,
  ErrorBoundary,
  FlexColumn,
  FlexRow,
  ContextMenuProvider,
} from 'sonar';
import {setupMenu, activateMenuItems} from './MenuBar.js';
import child_process, {ChildProcess} from 'child_process';
import {devicePlugins} from './device-plugins/index.js';
import AndroidDevice from './devices/AndroidDevice.js';
import WelcomeScreen from './chrome/WelcomeScreen.js';
import SonarTitleBar from './chrome/SonarTitleBar.js';
import BaseDevice from './devices/BaseDevice.js';
import IOSDevice from './devices/IOSDevice.js';
import MainSidebar from './chrome/MainSidebar.js';
import {SonarBasePlugin} from './plugin.js';
import {Server, Client} from './server.js';
import * as reducers from './reducers.js';
import ReactDOM from 'react-dom';
import React from 'react';
import BugReporter from './fb-stubs/BugReporter.js';
import ErrorReporter from './fb-stubs/ErrorReporter.js';
import BugReporterDialog from './chrome/BugReporterDialog.js';
import ErrorBar from './chrome/ErrorBar.js';
import Logger from './fb-stubs/Logger.js';
import GK from './fb-stubs/GK.js';
import PluginContainer from './PluginContainer.js';
import PropTypes from 'prop-types';
import {precachedIcons} from './utils/icons.js';
import PluginManager from './chrome/PluginManager.js';
import OculusDevice from './devices/OculusDevice.js';

const electron = require('electron');
const path = require('path');
const yargs = require('yargs');
const adb = require('adbkit-fb');

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

export type Devices = {
  [deviceId: string]: BaseDevice,
};

export type State = {
  activePluginKey: ?string,
  activeAppKey: ?string,
  devices: Devices,
  plugins: StatePlugins,
  error: ?string,
  server: Server,
  leftSidebarVisible: boolean,
  rightSidebarVisible: ?boolean,
  bugDialogVisible: boolean,
  windowIsFocused: boolean,
  pluginManagerVisible: boolean,
};

type iOSSimulatorDevice = {|
  state: string,
  availability: string,
  name: string,
  udid: string,
|};

const ACCENT = '#8875c5';
const theme = {
  accent: ACCENT,
  primary: ACCENT,
};

type IOSDeviceMap = {[id: string]: Array<iOSSimulatorDevice>};

export default class App extends React.Component<{}, State> {
  static childContextTypes = {
    windowIsFocused: PropTypes.bool,
  };

  constructor() {
    performance.mark('init');
    super();
    GK.init();
    this.initTracking();

    this.logger = new Logger();

    this.state = {
      activeAppKey: null,
      activePluginKey: null,
      error: null,
      devices: {},
      plugins: {},
      leftSidebarVisible: true,
      rightSidebarVisible: null,
      bugDialogVisible: false,
      server: this.initServer(),
      windowIsFocused: electron.remote.getCurrentWindow().isFocused(),
      pluginManagerVisible: false,
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
  portForwarder: ChildProcess;
  _hasActivatedPreferredPlugin: boolean = false;

  componentDidMount() {
    this.logger.trackTimeSince('init');
    const currentWindow = electron.remote.getCurrentWindow();
    currentWindow.on('focus', this.onFocus);
    currentWindow.on('blur', this.onBlur);

    // close socket before reloading
    window.addEventListener('beforeunload', () => {
      this.state.server.close();
    });
  }

  componentWillUnmount() {
    const currentWindow = electron.remote.getCurrentWindow();
    currentWindow.removeListener('focus', this.onFocus);
    currentWindow.removeListener('blur', this.onBlur);
  }

  onFocus = () => this.setState({windowIsFocused: true});
  onBlur = () => this.setState({windowIsFocused: false});

  getChildContext() {
    return {windowIsFocused: this.state.windowIsFocused};
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

    if (process.env.NODE_ENV !== 'test') {
      // monitoring iOS devices only available on MacOS.
      if (process.platform === 'darwin') {
        this.monitorIOSDevices();
      }
      if (process.platform === 'win32') {
        this.monitorOculus();
      }
      this.monitorAndroidDevices();
    }

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
      const device = this.state.devices[activeAppKey];
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

  ensurePluginSelected = () => {
    // check if we need to rehydrate this client as it may have been previously active
    const {activeAppKey, activePluginKey, devices, server} = this.state;

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

      const deviceList = ((Object.values(devices): any): Array<BaseDevice>);
      if (deviceList.length > 0) {
        const device = deviceList[0];
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

      const device = this.getDevice(activeAppKey);
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

  addDevice(device: BaseDevice) {
    this.setState(
      {
        devices: {
          ...this.state.devices,
          [device.serial]: device,
        },
      },
      this.ensurePluginSelected,
    );
  }

  getDevice(serial: string): ?BaseDevice {
    const device = this.state.devices[serial];
    if (device != null) {
      return device;
    }
  }

  removeDevice(device: BaseDevice) {
    device.teardown();
    const devices = {...this.state.devices};
    delete devices[device.serial];
    this.setState({devices}, this.ensurePluginSelected);
  }

  monitorIOSDevices() {
    // start port forwarding server for real device connections
    this.portForwarder = child_process.exec(
      'PortForwardingMacApp.app/Contents/MacOS/PortForwardingMacApp -portForward=8088 -multiplexChannelPort=8078',
    );
    const querySimulatorDevices = (): Promise<IOSDeviceMap> => {
      return new Promise((resolve, reject) => {
        child_process.execFile(
          'xcrun',
          ['simctl', 'list', 'devices', '--json'],
          {encoding: 'utf8'},
          (err, stdout) => {
            if (err) {
              console.error('Failed to load iOS devices', err);
              return resolve({});
            }

            try {
              const {devices} = JSON.parse(stdout.toString());
              resolve(devices);
            } catch (err) {
              console.error('Failed to parse iOS device list', err);
              resolve({});
            }
          },
        );
      });
    };

    const findAvailableSimulatorDevice = (devices: IOSDeviceMap) => {
      for (const deviceType in devices) {
        for (const device of devices[deviceType]) {
          if (
            device.availability === '(available)' &&
            device.state === 'Booted'
          ) {
            return device;
          }
        }
      }

      return null;
    };

    const findSimulatorDeviceById = (udid: string, devices: IOSDeviceMap) => {
      for (const deviceType in devices) {
        for (const device of devices[deviceType]) {
          if (device.udid === udid) {
            return device;
          }
        }
      }

      return null;
    };

    setInterval(() => {
      querySimulatorDevices().then((simulatorDevices: IOSDeviceMap) => {
        for (const deviceSerial of Object.keys(this.state.devices)) {
          const possibleDevice = findSimulatorDeviceById(
            deviceSerial,
            simulatorDevices,
          );
          if (
            possibleDevice &&
            (possibleDevice.state === 'Shutdown' ||
              possibleDevice.state === 'Shutting Down')
          ) {
            this.removeDevice(this.state.devices[deviceSerial]);
          }
        }

        const device = findAvailableSimulatorDevice(simulatorDevices);
        if (!device) {
          return;
        }

        const possibleDevice = this.state.devices[device.udid];
        if (!possibleDevice) {
          this.addDevice(new IOSDevice(device.udid, 'emulator', device.name));
        }
      });
    }, 3000);
  }

  monitorAndroidDevices() {
    const client = adb.createClient();

    const registerDevice = device => {
      const type =
        device.type !== 'device' || device.id.startsWith('emulator')
          ? 'emulator'
          : 'physical';
      client.getProperties(device.id).then(props => {
        const androidDevice = new AndroidDevice(
          device.id,
          type,
          props['ro.product.model'],
          client,
        );
        androidDevice.reverse();
        this.addDevice(androidDevice);
      });
    };

    const unregisterDevice = device => {
      const possibleDevice = this.state.devices[device.id];
      if (possibleDevice) {
        this.removeDevice(possibleDevice);
      }
    };

    client
      .trackDevices()
      .then(tracker => {
        tracker.on('error', err => {
          if (err.message === 'Connection closed') {
            // adb server has shutdown, remove all android devices
            for (const id in this.state.devices) {
              const possibleDevice = this.state.devices[id];
              if (possibleDevice instanceof AndroidDevice) {
                this.removeDevice(possibleDevice);
              }
            }
            this.setState({
              error:
                'adb server shutdown. Run `adb start-server` and restart Sonar.',
            });
          } else {
            throw err;
          }
        });

        tracker.on('add', device => {
          if (device.type !== 'offline') {
            registerDevice(device);
          }
        });

        tracker.on('change', device => {
          if (device.type === 'offline') {
            unregisterDevice(device);
          } else {
            registerDevice(device);
          }
        });

        tracker.on('remove', device => {
          unregisterDevice(device);
        });
      })
      .catch(err => {
        if (err.code === 'ECONNREFUSED') {
          // adb server isn't running
        } else {
          throw err;
        }
      });
  }

  monitorOculus = () => {
    setTimeout(() =>
      this.addDevice(new OculusDevice('test id', 'physical', 'Oculus Service')),
    );
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
    this.setState({
      rightSidebarVisible: null,
    });

    activateMenuItems(pluginKey);

    this.setState(state =>
      reducers.ActivatePlugin(this, state, {
        appKey,
        pluginKey,
      }),
    );
  };

  onReportBugOpen = () => {
    this.setState({bugDialogVisible: true});
  };

  onReportBugClose = () => {
    this.setState({bugDialogVisible: false});
  };

  onToggleLeftSidebar = () =>
    this.setState({leftSidebarVisible: !this.state.leftSidebarVisible});

  onToggleRightSidebar = () =>
    this.setState({rightSidebarVisible: !this.state.rightSidebarVisible});

  onSetRightSidebarVisible = (rightSidebarVisible: ?boolean) =>
    this.setState({rightSidebarVisible});

  onTogglePluginManager = () =>
    this.setState({pluginManagerVisible: !this.state.pluginManagerVisible});

  render() {
    const {state} = this;
    const hasDevices =
      Object.keys(state.devices).length > 0 ||
      state.server.connections.size > 0;
    let mainView = null;

    const {activeAppKey, activePluginKey} = state;
    if (activeAppKey != null && activePluginKey != null) {
      const clientPlugins = state.plugins[activeAppKey];
      const pluginInfo = clientPlugins && clientPlugins[activePluginKey];
      const plugin = pluginInfo && pluginInfo.plugin;
      if (plugin) {
        mainView = state.pluginManagerVisible ? (
          <PluginManager />
        ) : (
          <ErrorBoundary
            heading={`Plugin "${
              plugin.constructor.title
            }" encountered an error during render`}>
            <PluginContainer
              logger={this.logger}
              plugin={plugin}
              rightSidebarVisible={this.state.rightSidebarVisible}
              onSetRightSidebarVisible={this.onSetRightSidebarVisible}
            />
          </ErrorBoundary>
        );
      }
    }

    return (
      <ContextMenuProvider>
        <ThemeProvider theme={theme}>
          <FlexColumn fill={true}>
            <SonarTitleBar
              leftSidebarVisible={this.state.leftSidebarVisible}
              onToggleLeftSidebar={this.onToggleLeftSidebar}
              rightSidebarVisible={this.state.rightSidebarVisible}
              devices={this.state.devices}
              onToggleRightSidebar={this.onToggleRightSidebar}
              onReportBug={this.onReportBugOpen}
              onTogglePluginManager={this.onTogglePluginManager}
              pluginManagerVisible={this.state.pluginManagerVisible}
            />
            {this.state.bugDialogVisible && (
              <BugReporterDialog
                bugReporter={this.bugReporter}
                close={this.onReportBugClose}
              />
            )}
            {hasDevices ? (
              <FlexRow fill={true}>
                {this.state.leftSidebarVisible && (
                  <MainSidebar
                    activePluginKey={state.activePluginKey}
                    activeAppKey={state.activeAppKey}
                    devices={state.devices}
                    server={state.server}
                    onActivatePlugin={this.onActivatePlugin}
                  />
                )}
                {mainView}
              </FlexRow>
            ) : this.state.pluginManagerVisible ? (
              <PluginManager />
            ) : (
              <WelcomeScreen />
            )}
            <ErrorBar text={state.error} />
          </FlexColumn>
        </ThemeProvider>
      </ContextMenuProvider>
    );
  }
}

// $FlowFixMe: this element exists!
ReactDOM.render(<App />, document.getElementById('root'));
// $FlowFixMe: service workers exist!
navigator.serviceWorker
  .register(
    process.env.NODE_ENV === 'production'
      ? path.join(__dirname, 'serviceWorker.js')
      : './serviceWorker.js',
  )
  .then(r => {
    (r.installing || r.active).postMessage({precachedIcons});
  })
  .catch(console.error);
