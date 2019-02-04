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

// Polyfills
global.WebSocket = require('ws'); // used for redux devtools
global.fetch = require('node-fetch/lib/index');

process.env.BUNDLED_PLUGIN_PATH =
  process.env.BUNDLED_PLUGIN_PATH ||
  path.join(path.dirname(process.execPath), 'plugins');

// needs to be required after WebSocket polyfill is loaded
const devToolsEnhancer = require('remote-redux-devtools').default;

setup();
const store = createStore(
  reducers,
  devToolsEnhancer({realtime: true, hostname: 'localhost', port: 8181}),
);
const logger = new Logger(store);
init(store);
dispatcher(store, logger);
