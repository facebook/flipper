/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {initializeElectron} from './electron/initializeElectron';
import {enableMapSet} from 'immer';

initializeElectron();

enableMapSet();

// By turning this in a require, we force the JS that the body of this module (init) has completed (initializeElectron),
// before starting the rest of the Flipper process.
// This prevent issues where the render host is referred at module initialisation level,
// but not set yet, which might happen when using normal imports.
// eslint-disable-next-line import/no-commonjs
require('flipper-ui-core').startFlipperDesktop();
