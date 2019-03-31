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
// $FlowFixMe this file exist, trust me, flow!
import setup from '../static/setup.js';

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
    },
    startFlipper,
  )
  .version(global.__VERSION__)
  .help().argv; // http://yargs.js.org/docs/#api-argv

function startFlipper({
  dev,
  verbose,
  exit,
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
  const devToolsEnhancer = require('remote-redux-devtools');

  const headlessMiddleware = store => next => action => {
    if (exit == 'disconnect' && action.type == 'CLIENT_REMOVED') {
      // TODO(T42325892): Investigate why the export stalls without exiting the
      // current eventloop task here.
      setTimeout(() => {
        exportStore(store)
          .then(output => {
            originalConsole.log(output);
            process.exit();
          })
          .catch(console.error);
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
  dispatcher(store, logger);

  if (exit == 'sigint') {
    process.on('SIGINT', async () => {
      try {
        originalConsole.log(await exportStore(store));
      } catch (e) {
        console.error(e);
      }
      process.exit();
    });
  }
}
