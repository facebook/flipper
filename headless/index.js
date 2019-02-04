/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {createStore} from 'redux';
import reducers from '../src/reducers/index.js';
import dispatcher from '../src/dispatcher/index.js';
import Logger, {init} from '../src/fb-stubs/Logger.js';
import path from 'path';
// $FlowFixMe this file exist, trust me, flow!
import setup from '../static/setup.js';
import yargs from 'yargs';
import {serializeStore} from '../src/utils/exportData.js';

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
      yargs.option('v', {
        alias: 'verbose',
        default: false,
        describe: 'Enable verbose logging',
        type: 'boolean',
      });
    },
    startFlipper,
  )
  .version(global.__VERSION__)
  .help().argv;

function startFlipper({
  dev,
  verbose,
  'insecure-port': insecurePort,
  'secure-port': securePort,
}) {
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
  const devToolsEnhancer = require('remote-redux-devtools').default;

  setup();
  const store = dev
    ? createStore(
        reducers,
        devToolsEnhancer({realtime: true, hostname: 'localhost', port: 8181}),
      )
    : createStore(reducers);
  const logger = new Logger(store);
  init(store);
  dispatcher(store, logger);

  process.on('SIGINT', () => {
    originalConsole.log(
      JSON.stringify(serializeStore(store.getState()), null, 2),
    );
    process.exit();
  });
}
