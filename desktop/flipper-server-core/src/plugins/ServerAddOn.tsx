/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import assert from 'assert';
import {assertNotNull} from '../comms/Utilities';
import {
  ServerAddOnDesktopToModuleConnection,
  FlipperServerForServerAddOn,
} from './ServerAddOnDesktopToModuleConnection';
import {
  ServerAddOnModuleToDesktopConnection,
  ServerAddOnPluginConnection,
} from './ServerAddOnModuleToDesktopConnection';

type ServerAddOnCleanup = () => Promise<void>;
interface ServerAddOnModule {
  serverAddOn?: (
    connection: ServerAddOnPluginConnection,
    {flipperServer}: {flipperServer: FlipperServerForServerAddOn},
  ) => Promise<ServerAddOnCleanup>;
}

const loadPlugin = (_pluginName: string): ServerAddOnModule => {
  // TODO: Implement me
  return {serverAddOn: async () => async () => {}};
};

// TODO: Fix potential race conditions when starting/stopping concurrently
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
    initialOwner: string,
    onStop: () => void,
    flipperServer: FlipperServerForServerAddOn,
  ): Promise<ServerAddOn> {
    console.info('ServerAddOn.start', pluginName);

    const {serverAddOn} = loadPlugin(pluginName);
    assertNotNull(serverAddOn);
    assert(
      typeof serverAddOn === 'function',
      `ServerAddOn ${pluginName} must export "serverAddOn" function.`,
    );

    const serverAddOnModuleToDesktopConnection =
      new ServerAddOnModuleToDesktopConnection();

    const cleanup = await serverAddOn(serverAddOnModuleToDesktopConnection, {
      flipperServer,
    });
    assert(
      typeof cleanup === 'function',
      `ServerAddOn ${pluginName} must return a clean up function, instead it returned ${typeof cleanup}.`,
    );

    const onStopCombined = async () => {
      onStop();
      await cleanup();
    };

    const desktopToModuleConnection = new ServerAddOnDesktopToModuleConnection(
      serverAddOnModuleToDesktopConnection,
      flipperServer,
    );

    return new ServerAddOn(
      pluginName,
      onStopCombined,
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
      this.stop().catch((e) => {
        console.error(
          'ServerAddOn.removeOwner -> failed to stop automatically when no owners left',
          this.pluginName,
          e,
        );
      });
    }
  }

  private async stop() {
    console.info('ServerAddOn.stop', this.pluginName);
    try {
      await this.cleanup();
    } catch (e) {
      console.error('ServerAddOn.stop -> failed to clean up', this.pluginName);
    }
  }
}
