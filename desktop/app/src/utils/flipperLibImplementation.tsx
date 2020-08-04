/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import type {FlipperLib} from 'flipper-plugin';
import type {Logger} from '../fb-interfaces/Logger';
import type {Store} from '../reducers';
import createPaste from '../fb-stubs/createPaste';

let flipperLibInstance: FlipperLib | undefined;

export function initializeFlipperLibImplementation(
  _store: Store,
  _logger: Logger,
) {
  // late require to avoid cyclic dependency
  const {addSandyPluginEntries} = require('../MenuBar');
  flipperLibInstance = {
    enableMenuEntries(entries) {
      addSandyPluginEntries(entries);
    },
    createPaste,
  };
}

export function getFlipperLibImplementation(): FlipperLib {
  if (!flipperLibInstance) {
    throw new Error('Flipper lib not instantiated');
  }
  return flipperLibInstance;
}

export function setFlipperLibImplementation(impl: FlipperLib) {
  flipperLibInstance = impl;
}
