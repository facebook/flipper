/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperClient} from './api';
import {newWebviewClient} from './webviewImpl';
import {AnalyticsLoggingFlipperPlugin} from './plugins/analyticsLogging';
import {FuryPlugin} from './plugins/fury';

class FlipperManager {
  flipperClient: FlipperClient;
  analyticsPlugin: AnalyticsLoggingFlipperPlugin;
  furyPlugin: FuryPlugin;

  constructor() {
    this.flipperClient = newWebviewClient();
    this.analyticsPlugin = new AnalyticsLoggingFlipperPlugin();
    this.furyPlugin = new FuryPlugin();
    this.flipperClient.addPlugin(this.analyticsPlugin);
    this.flipperClient.addPlugin(this.furyPlugin);
    this.flipperClient.start('Example JS App');
  }
}

let flipperManager: ?FlipperManager;

export function init() {
  if (!flipperManager) {
    flipperManager = new FlipperManager();
  }
}

export function flipper(): ?FlipperManager {
  return flipperManager;
}
