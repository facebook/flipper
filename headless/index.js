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
import {exportStore} from '../src/utils/exportData.js';
import {
  exportMetricsWithoutTrace,
  exportMetricsFromTrace,
} from '../src/utils/exportMetrics.js';
import {listDevices} from '../src/utils/listDevices';
// $FlowFixMe this file exist, trust me, flow!
import setup from '../static/setup.js';
import type {Store} from '../src/reducers';

type UserArguments = {|
  securePort: string,
  insecurePort: string,
  dev: boolean,
  exit: 'sigint' | 'disconnect',
  verbose: boolean,
  metrics: string,
  showDevices: boolean,
  selectedDeviceID: string,
|};

yargs
  .usage('$0 [args]')
  .command(
    '*',
    'Start a headless Flipper instance',
    yargs => {
      yargs.option('secure-port', {
        alias: 'securePort',
        default: '8088',
        describe: 'Secure port the Flipper server should run on.',
        type: 'string',
      });
      yargs.option('insecure-port', {
        alias: 'insecurePort',
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
        alias: 'metrics',
        default: undefined,
        describe: 'Will export metrics instead of data when flipper terminates',
        type: 'string',
      });
      yargs.option('list-devices', {
        alias: 'showDevices',
        default: false,
        describe: 'Will print the list of devices in the terminal',
        type: 'boolean',
      });
      yargs.option('device', {
        alias: 'selectedDeviceID',
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

async function earlyExitActions(
  userArguments: UserArguments,
  originalConsole: typeof global.console,
): Promise<void> {
  const {showDevices} = userArguments;
  if (showDevices) {
    const devices = await listDevices();
    originalConsole.log(devices);
    process.exit();
  }
}

async function exitActions(
  userArguments: UserArguments,
  originalConsole: typeof global.console,
  store: Store,
): Promise<void> {
  const {metrics, exit} = userArguments;
  if (shouldExportMetric(metrics) && metrics && metrics.length > 0) {
    try {
      const payload = await exportMetricsFromTrace(metrics, store.getState());
      originalConsole.log(payload);
    } catch (error) {
      console.error(error);
    }
    process.exit();
  }
  if (exit == 'sigint') {
    process.on('SIGINT', async () => {
      try {
        if (shouldExportMetric(metrics) && !metrics) {
          const state = store.getState();
          const payload = await exportMetricsWithoutTrace(
            state,
            state.pluginStates,
          );
          originalConsole.log(payload);
        } else {
          const {serializedString, errorArray} = await exportStore(store);
          errorArray.forEach(console.error);
          originalConsole.log(serializedString);
        }
      } catch (e) {
        console.error(e);
      }
      process.exit();
    });
  }
}

async function storeModifyingActions(
  userArguments: UserArguments,
  originalConsole: typeof global.console,
  store: Store,
): Promise<void> {
  const {selectedDeviceID} = userArguments;
  if (selectedDeviceID) {
    //$FlowFixMe: Checked the class name before calling reverse.
    const devices = await listDevices();
    const matchedDevice = devices.find(
      device => device.serial === selectedDeviceID,
    );
    if (matchedDevice) {
      if (matchedDevice.constructor.name === 'AndroidDevice') {
        const ports = store.getState().application.serverPorts;
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
    } else {
      console.error(`No device matching the serial ${selectedDeviceID}`);
      process.exit();
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
              originalConsole.log(payload);
              process.exit();
            })
            .catch(console.error);
        } else {
          exportStore(store)
            .then(({serializedString}) => {
              originalConsole.log(serializedString);
              process.exit();
            })
            .catch(console.error);
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

  await earlyExitActions(userArguments, originalConsole);

  dispatcher(store, logger);

  await storeModifyingActions(userArguments, originalConsole, store);

  await exitActions(userArguments, originalConsole, store);
}
