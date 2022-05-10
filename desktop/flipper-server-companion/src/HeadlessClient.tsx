/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {ClientQuery, FlipperServer, Logger} from 'flipper-common';
import {
  AbstractClient,
  ClientConnection,
  BaseDevice,
} from 'flipper-frontend-core';
import {_SandyPluginDefinition} from 'flipper-plugin';

export class HeadlessClient extends AbstractClient {
  constructor(
    id: string,
    query: ClientQuery,
    conn: ClientConnection | null | undefined,
    logger: Logger,
    plugins: Set<string> | null | undefined,
    device: BaseDevice,
    flipperServer: FlipperServer,
    private loadablePlugins: Map<string, _SandyPluginDefinition>,
  ) {
    super(id, query, conn, logger, plugins, device, flipperServer);
  }

  // Headless client never starts plugins automaticaly to preserve server resources
  shouldConnectAsBackgroundPlugin() {
    return false;
  }

  async getPlugin(pluginId: string) {
    return this.loadablePlugins.get(pluginId);
  }
}
