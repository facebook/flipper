/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import assert from 'assert';
import {assertNotNull} from '../app-connectivity/Utilities';
import {
  FlipperServerForServerAddOn,
  ServerAddOnCleanup,
  ServerAddOnStartDetails,
} from 'flipper-common';
import {ServerAddOnDesktopToModuleConnection} from './ServerAddOnDesktopToModuleConnection';
import {ServerAddOnModuleToDesktopConnection} from './ServerAddOnModuleToDesktopConnection';
import {loadServerAddOn} from './loadServerAddOn';

export class ServerAddOn {
  private owners: Set<string>;

  constructor(
    public readonly pluginName: string,
    private readonly cleanup: ServerAddOnCleanup,
    public readonly connection: ServerAddOnDesktopToModuleConnection,
    initialOwner: string,
  ) {
    this.owners = new Set([initialOwner]);
  }

  static async start(
    pluginName: string,
    details: ServerAddOnStartDetails,
    initialOwner: string,
    flipperServer: FlipperServerForServerAddOn,
  ): Promise<ServerAddOn> {
    console.info('ServerAddOn.start', pluginName, details);

    const {default: serverAddOn} = loadServerAddOn(pluginName, details);
    assertNotNull(serverAddOn);
    assert(
      typeof serverAddOn === 'function',
      `ServerAddOn ${pluginName} must export "serverAddOn" function as a default export.`,
    );

    const serverAddOnModuleToDesktopConnection =
      new ServerAddOnModuleToDesktopConnection(pluginName);

    const cleanup = await serverAddOn(serverAddOnModuleToDesktopConnection, {
      flipperServer,
    });
    assert(
      typeof cleanup === 'function',
      `ServerAddOn ${pluginName} must return a clean up function, instead it returned ${typeof cleanup}.`,
    );

    const desktopToModuleConnection = new ServerAddOnDesktopToModuleConnection(
      serverAddOnModuleToDesktopConnection,
      flipperServer,
    );

    return new ServerAddOn(
      pluginName,
      cleanup,
      desktopToModuleConnection,
      initialOwner,
    );
  }

  addOwner(owner: string) {
    this.owners.add(owner);
  }

  removeOwner(owner: string) {
    const ownerExisted = this.owners.delete(owner);

    if (!this.owners.size && ownerExisted) {
      return this.stop();
    }
  }

  async stop() {
    console.info('ServerAddOn.stop', this.pluginName);
    await this.cleanup();
  }
}
