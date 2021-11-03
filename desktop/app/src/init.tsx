/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {initializeElectron} from './electron/initializeElectron';

import GK from './fb-stubs/GK';
import {enableMapSet} from 'immer';
import os from 'os';

initializeElectron();

if (process.env.NODE_ENV === 'development' && os.platform() === 'darwin') {
  // By default Node.JS has its internal certificate storage and doesn't use
  // the system store. Because of this, it's impossible to access ondemand / devserver
  // which are signed using some internal self-issued FB certificates. These certificates
  // are automatically installed to MacOS system store on FB machines, so here we're using
  // this "mac-ca" library to load them into Node.JS.
  global.electronRequire('mac-ca');
}

enableMapSet();

GK.init();

// By turning this in a require, we force the JS that the body of this module (init) has completed (initializeElectron),
// before starting the rest of the Flipper process.
// This prevent issues where the render host is referred at module initialisation level,
// but not set yet, which might happen when using normal imports.
// eslint-disable-next-line import/no-commonjs
require('./startFlipperDesktop');
