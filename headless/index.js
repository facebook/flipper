/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import path from 'path';
import {createStore} from 'redux';
import {applyMiddleware} from 'redux';
import yargs from 'yargs';
import dispatcher from '../src/dispatcher/index.js';
import {init as initLogger} from '../src/fb-stubs/Logger.js';
import reducers from '../src/reducers/index.js';
import {exportStore, pluginsClassMap} from '../src/utils/exportData.js';
import {
  exportMetricsWithoutTrace,
  exportMetricsFromTrace,
} from '../src/utils/exportMetrics.js';
import {listDevices} from '../src/utils/listDevices';
// $FlowFixMe this file exist, trust me, flow!
import setup from '../static/setup.js';
import type {Store} from '../src/reducers';
import {getActivePluginNames} from '../src/utils/pluginUtils.js';
import {serialize} from '../src/utils/serialization';
import type BaseDevice from '../src/devices/BaseDevice';

import {getStringFromErrorLike} from '../src/utils/index';

type Action = {|exit: true, result: string|} | {|exit: false|};

type UserArguments = {|
  securePort: string,
  insecurePort: string,
  dev: boolean,
  exit: 'sigint' | 'disconnect',
  verbose: boolean,
  metrics: string,
  listDevices: boolean,
  device: string,
  listPlugins: boolean,
|};

yargs
  .usage('$0 [args]')
  .command(
    '*',
    'Start a headless Flipper instance',
    yargs => {
      yargs.option('secure-port', {
        default: '8088',
        describe: 'Secure port the Flipper server should run on.',
        type: 'string',
      });
      yargs.option('insecure-port', {
        default: '8089',
        describe: 'Insecure port the Flipper server should run on.',
        type: 'string',
      });
      yargs.option('dev', {
        default: false,
        describe:
          'Enable redux-devtools. Tries to connect to devtools running on port 8181',
        type: 'boolean',
      });
      yargs.option('exit', {
        describe: 'Controls when to exit and dump the store to stdout.',
        choices: ['sigint', 'disconnect'],
        default: 'sigint',
      });
      yargs.option('v', {
        alias: 'verbose',
        default: false,
        describe: 'Enable verbose logging',
        type: 'boolean',
      });
      yargs.option('metrics', {
        default: undefined,
        describe: 'Will export metrics instead of data when flipper terminates',
        type: 'string',
      });
      yargs.option('list-devices', {
        default: false,
        describe: 'Will print the list of devices in the terminal',
        type: 'boolean',
      });
      yargs.option('list-plugins', {
        default: false,
        describe: 'Will print the list of supported plugins in the terminal',
        type: 'boolean',
      });
      yargs.option('device', {
        default: undefined,
        describe:
          'The identifier passed will be matched against the udid of the available devices and the matched device would be selected',
        type: 'string',
      });
    },
    startFlipper,
  )
  .version(global.__VERSION__)
  .help().argv; // http://yargs.js.org/docs/#api-argv

function shouldExportMetric(metrics): boolean {
  if (!metrics) {
    return process.argv.includes('--metrics');
  }
  return true;
}

function outputAndExit(output: string): void {
  console.log(`Finished. Outputting ${output.length} characters.`);
  process.stdout.write(output, () => {
    process.exit(0);
  });
}

function errorAndExit(error: any): void {
  process.stderr.write(getStringFromErrorLike(error), () => {
    process.exit(1);
  });
}

async function earlyExitActions(
  exitClosures: Array<(userArguments: UserArguments) => Promise<Action>>,
  userArguments: UserArguments,
  originalConsole: typeof global.console,
): Promise<void> {
  for (const exitAction of exitClosures) {
    try {
      const action = await exitAction(userArguments);
      if (action.exit) {
        outputAndExit(action.result);
      }
    } catch (e) {
      errorAndExit(e);
    }
  }
}

async function exitActions(
  exitClosures: Array<
    (userArguments: UserArguments, store: Store) => Promise<Action>,
  >,
  userArguments: UserArguments,
  store: Store,
): Promise<void> {
  const {metrics, exit} = userArguments;
  for (const exitAction of exitClosures) {
    try {
      const action = await exitAction(userArguments, store);
      if (action.exit) {
        outputAndExit(action.result);
      }
    } catch (e) {
      errorAndExit(e);
    }
  }

  if (exit == 'sigint') {
    process.on('SIGINT', async () => {
      try {
        if (shouldExportMetric(metrics) && !metrics) {
          const state = store.getState();
          const payload = await exportMetricsWithoutTrace(
            store,
            state.pluginStates,
          );
          outputAndExit(payload.toString());
        } else {
          const {serializedString, errorArray} = await exportStore(store);
          errorArray.forEach(console.error);
          outputAndExit(serializedString);
        }
      } catch (e) {
        errorAndExit(e);
      }
    });
  }
}

async function storeModifyingActions(
  storeModifyingClosures: Array<
    (userArguments: UserArguments, store: Store) => Promise<Action>,
  >,
  userArguments: UserArguments,
  store: Store,
): Promise<void> {
  for (const closure of storeModifyingClosures) {
    try {
      const action = await closure(userArguments, store);
      if (action.exit) {
        outputAndExit(action.result);
      }
    } catch (e) {
      errorAndExit(e);
    }
  }
}

async function startFlipper(userArguments: UserArguments) {
  const {verbose, metrics, exit, insecurePort, securePort} = userArguments;
  console.error(`
   _____ _ _
  |   __| |_|___ ___ ___ ___
  |   __| | | . | . | -_|  _|
  |__|  |_|_|  _|  _|___|_| v${global.__VERSION__}
            |_| |_|
  `);
  // redirect all logging to stderr
  const originalConsole = global.console;
  global.console = new Proxy(console, {
    get: function(obj, prop) {
      return (...args) => {
        if (prop === 'error' || verbose) {
          originalConsole.error(`[${prop}] `, ...args);
        }
      };
    },
  });

  // Polyfills
  global.WebSocket = require('ws'); // used for redux devtools
  global.fetch = require('node-fetch/lib/index');

  process.env.BUNDLED_PLUGIN_PATH =
    process.env.BUNDLED_PLUGIN_PATH ||
    path.join(path.dirname(process.execPath), 'plugins');

  process.env.FLIPPER_PORTS = `${insecurePort},${securePort}`;

  // needs to be required after WebSocket polyfill is loaded
  const devToolsEnhancer = require('remote-redux-devtools');

  const headlessMiddleware = store => next => action => {
    if (exit == 'disconnect' && action.type == 'CLIENT_REMOVED') {
      // TODO(T42325892): Investigate why the export stalls without exiting the
      // current eventloop task here.
      setTimeout(() => {
        if (shouldExportMetric(metrics) && !metrics) {
          const state = store.getState();
          exportMetricsWithoutTrace(state, state.pluginStates)
            .then(payload => {
              outputAndExit(payload || '');
            })
            .catch(e => {
              errorAndExit(e);
            });
        } else {
          exportStore(store)
            .then(({serializedString}) => {
              outputAndExit(serializedString);
            })
            .catch(e => {
              errorAndExit(e);
            });
        }
      }, 10);
    }
    return next(action);
  };

  setup({});
  const store = createStore(
    reducers,
    devToolsEnhancer.composeWithDevTools(applyMiddleware(headlessMiddleware)),
  );
  const logger = initLogger(store, {isHeadless: true});

  const earlyExitClosures: Array<
    (userArguments: UserArguments) => Promise<Action>,
  > = [
    (userArguments: UserArguments) => {
      if (userArguments.listDevices) {
        return listDevices().then(async (devices: Array<BaseDevice>) => {
          const mapped = devices.map(device => {
            return {
              os: device.os,
              title: device.title,
              deviceType: device.deviceType,
              serial: device.serial,
            };
          });
          return {exit: true, result: await serialize(mapped)};
        });
      }
      return Promise.resolve({exit: false});
    },
  ];

  await earlyExitActions(earlyExitClosures, userArguments);

  const cleanupDispatchers = dispatcher(store, logger);

  const storeModifyingClosures: Array<
    (userArguments: UserArguments, store: Store) => Promise<Action>,
  > = [
    (userArguments: UserArguments, store: Store) => {
      const {device: selectedDeviceID} = userArguments;
      if (selectedDeviceID) {
        return listDevices().then(devices => {
          const matchedDevice = devices.find(
            device => device.serial === selectedDeviceID,
          );
          if (matchedDevice) {
            if (matchedDevice.constructor.name === 'AndroidDevice') {
              const ports = store.getState().application.serverPorts;
              //$FlowFixMe: Checked the class name before calling reverse.
              matchedDevice.reverse([ports.secure, ports.insecure]);
            }
            store.dispatch({
              type: 'REGISTER_DEVICE',
              payload: matchedDevice,
            });
            store.dispatch({
              type: 'SELECT_DEVICE',
              payload: matchedDevice,
            });
            return {exit: false};
          }
          return Promise.reject(
            new Error(`No device matching the serial ${selectedDeviceID}`),
          );
        });
      }
      return Promise.resolve({
        exit: false,
      });
    },
  ];

  const exitActionClosures: Array<
    (userArguments: UserArguments, store: Store) => Promise<Action>,
  > = [
    async (userArguments: UserArguments, store: Store) => {
      const {listPlugins} = userArguments;
      if (listPlugins) {
        return Promise.resolve({
          exit: true,
          result: await serialize(
            getActivePluginNames(store.getState().plugins),
          ),
        });
      }
      return Promise.resolve({
        exit: false,
      });
    },
    (userArguments: UserArguments, store: Store) => {
      const {metrics} = userArguments;
      if (shouldExportMetric(metrics) && metrics && metrics.length > 0) {
        return exportMetricsFromTrace(
          metrics,
          pluginsClassMap(store.getState().plugins),
        )
          .then(payload => {
            return {exit: true, result: payload ? payload.toString() : ''};
          })
          .catch(error => {
            return {exit: true, result: error};
          });
      }
      return Promise.resolve({exit: false});
    },
  ];

  await storeModifyingActions(storeModifyingClosures, userArguments, store);

  await exitActions(exitActionClosures, userArguments, store);

  await cleanupDispatchers();
}
