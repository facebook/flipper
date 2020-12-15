/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

/* eslint-disable flipper/no-relative-imports-across-packages */ // TODO T71355623

import path from 'path';
import {createStore, Dispatch, Middleware, MiddlewareAPI} from 'redux';
import {applyMiddleware} from 'redux';
import yargs, {Argv} from 'yargs';
import dispatcher from '../app/src/dispatcher/index';
import reducers, {Actions, State} from '../app/src/reducers/index';
import {init as initLogger} from '../app/src/fb-stubs/Logger';
import {exportStore} from '../app/src/utils/exportData';
import {listDevices} from '../app/src/utils/listDevices';
import setup from '../static/setup';
import {
  getPersistentPlugins,
  pluginsClassMap,
} from '../app/src/utils/pluginUtils';
import {serialize} from '../app/src/utils/serialization';
import {getStringFromErrorLike} from '../app/src/utils/index';
import AndroidDevice from '../app/src/devices/AndroidDevice';
import {Store} from 'flipper';

process.env.FLIPPER_HEADLESS = 'true';

type Action = {exit: boolean; result?: string};

type UserArguments = {
  securePort: string;
  insecurePort: string;
  dev: boolean;
  exit: 'sigint' | 'disconnect';
  verbose: boolean;
  metrics: boolean;
  listDevices: boolean;
  device: string;
  listPlugins: boolean;
  selectPlugins: Array<string>;
};

(yargs as Argv<UserArguments>)
  .usage('$0 [args]')
  .command<UserArguments>(
    '*',
    'Start a headless Flipper instance',
    (yargs: Argv<UserArguments>) => {
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
      yargs.option('select-plugins', {
        default: [],
        describe:
          'The data/metrics would be exported only for the selected plugins',
        type: 'array',
      });
      yargs.option('device', {
        default: undefined,
        describe:
          'The identifier passed will be matched against the udid of the available devices and the matched device would be selected',
        type: 'string',
      });
      return yargs;
    },
    startFlipper,
  )
  .version(global.__VERSION__)
  .help().argv; // http://yargs.js.org/docs/#api-argv

function outputAndExit(output: string | null | undefined): void {
  output = output || '';
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
  _originalConsole?: typeof global.console,
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
    (userArguments: UserArguments, store: Store) => Promise<Action>
  >,
  userArguments: UserArguments,
  store: Store,
): Promise<void> {
  const {exit} = userArguments;
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
        const {serializedString, fetchMetaDataErrors} = await exportStore(
          store,
        );
        console.error('Error while fetching metadata', fetchMetaDataErrors);
        outputAndExit(serializedString);
      } catch (e) {
        errorAndExit(e);
      }
    });
  }
}

async function storeModifyingActions(
  storeModifyingClosures: Array<
    (userArguments: UserArguments, store: Store) => Promise<Action>
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
  const {verbose, exit, insecurePort, securePort, metrics} = userArguments;
  console.error(`
   _____ _ _
  |   __| |_|___ ___ ___ ___
  |   __| | | . | . | -_|  _|
  |__|  |_|_|  _|  _|___|_| v${global.__VERSION__}
            |_| |_|
  `);
  if (metrics) {
    throw new Error(
      '--metrics is no longer supported, see D24332440 for details.',
    );
  }

  // redirect all logging to stderr
  const overriddenMethods = ['debug', 'info', 'log', 'warn', 'error'];
  for (const method of overriddenMethods) {
    (global.console as {[key: string]: any})[method] =
      method === 'error' || verbose ? global.console.error : () => {};
  }

  // Polyfills
  global.WebSocket = require('ws'); // used for redux devtools
  global.fetch = require('node-fetch/lib/index');

  process.env.BUNDLED_PLUGIN_PATH =
    process.env.BUNDLED_PLUGIN_PATH ||
    path.join(path.dirname(process.execPath), 'plugins');

  process.env.FLIPPER_PORTS = `${insecurePort},${securePort}`;

  // needs to be required after WebSocket polyfill is loaded
  const devToolsEnhancer = require('remote-redux-devtools');

  const headlessMiddleware: Middleware<{}, State, any> = (
    store: MiddlewareAPI<Dispatch<Actions>, State>,
  ) => (next: Dispatch<Actions>) => (action: Actions) => {
    if (exit == 'disconnect' && action.type == 'CLIENT_REMOVED') {
      // TODO(T42325892): Investigate why the export stalls without exiting the
      // current eventloop task here.
      setTimeout(() => {
        exportStore(store)
          .then(({serializedString}) => {
            outputAndExit(serializedString);
          })
          .catch((e: Error) => {
            errorAndExit(e);
          });
      }, 10);
    }
    return next(action);
  };

  setup({});
  const store = createStore<State, Actions, {}, {}>(
    reducers,
    devToolsEnhancer.composeWithDevTools(applyMiddleware(headlessMiddleware)),
  );
  const logger = initLogger(store, {isHeadless: true});

  const earlyExitClosures: Array<(
    userArguments: UserArguments,
  ) => Promise<Action>> = [
    async (userArguments: UserArguments) => {
      if (userArguments.listDevices) {
        const devices = await listDevices(store);
        const mapped = devices.map((device) => {
          return {
            os: device.os,
            title: device.title,
            deviceType: device.deviceType,
            serial: device.serial,
          };
        });
        return {exit: true, result: await serialize(mapped)};
      }
      return Promise.resolve({exit: false});
    },
  ];

  await earlyExitActions(earlyExitClosures, userArguments);

  const cleanupDispatchers = dispatcher(store, logger);

  const storeModifyingClosures: Array<(
    userArguments: UserArguments,
    store: Store,
  ) => Promise<Action>> = [
    async (userArguments: UserArguments, store: Store) => {
      const {device: selectedDeviceID} = userArguments;
      if (selectedDeviceID) {
        const devices = await listDevices(store);
        const matchedDevice = devices.find(
          (device) => device.serial === selectedDeviceID,
        );
        if (matchedDevice) {
          if (matchedDevice instanceof AndroidDevice) {
            const ports = store.getState().application.serverPorts;
            matchedDevice.reverse([ports.secure, ports.insecure]);
          }
          matchedDevice.loadDevicePlugins(
            store.getState().plugins.devicePlugins,
          );
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
        throw new Error(`No device matching the serial ${selectedDeviceID}`);
      }
      return {
        exit: false,
      };
    },
    async (userArguments: UserArguments, store: Store) => {
      const {selectPlugins} = userArguments;
      const selectedPlugins = selectPlugins.filter((selectPlugin) => {
        return selectPlugin != undefined;
      });
      if (selectedPlugins) {
        store.dispatch({
          type: 'SELECTED_PLUGINS',
          payload: selectedPlugins,
        });
      }
      return {
        exit: false,
      };
    },
  ];

  const exitActionClosures: Array<(
    userArguments: UserArguments,
    store: Store,
  ) => Promise<Action>> = [
    async (userArguments: UserArguments, store: Store) => {
      const {listPlugins} = userArguments;
      if (listPlugins) {
        return Promise.resolve({
          exit: true,
          result: await serialize(
            getPersistentPlugins(store.getState().plugins),
          ),
        });
      }
      return Promise.resolve({
        exit: false,
      });
    },
    async (userArguments: UserArguments, store: Store) => {
      return Promise.resolve({exit: false});
    },
  ];

  await storeModifyingActions(storeModifyingClosures, userArguments, store);

  await exitActions(exitActionClosures, userArguments, store);

  await cleanupDispatchers();
}
