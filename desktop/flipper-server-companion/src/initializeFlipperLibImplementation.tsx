/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  createState,
  Logger,
  _setFlipperLibImplementation,
} from 'flipper-plugin-core';
import {baseFlipperLibImplementation, RenderHost} from 'flipper-frontend-core';

export function initializeFlipperLibImplementation(
  renderHost: RenderHost,
  logger: Logger,
) {
  const base = baseFlipperLibImplementation(renderHost, logger);
  _setFlipperLibImplementation({
    ...base,
    intern: {
      ...base.intern,
      // TODO: Implement me
      currentUser: () => createState(null),
      // TODO: Implement me
      isConnected: () => createState(true),
    },
    enableMenuEntries() {},
    createPaste() {
      // TODO: Implement me
      throw new Error('Not implemented');
    },
    selectPlugin() {},
    showNotification() {
      // TODO: Write to stdout/stderr?
      throw new Error('Not supported in headless context');
    },
    settings() {
      return {isDarkMode: false};
    },
  });
}
