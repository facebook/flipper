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

type ServerAddOnCleanup = () => Promise<void>;
interface ServerAddOnModule {
  serverAddOn?: () => Promise<ServerAddOnCleanup>;
}

// TODO: Metro does not like dynamic requires. Figure out how to properly configure metro to handle them.
// https://github.com/webpack/webpack/issues/4175#issuecomment-323023911
function requireDynamically(path: string) {
  // eslint-disable-next-line no-eval
  return eval(`require('${path}');`); // Ensure Metro does not analyze the require statement
}

// TODO: Fix potential race conditions when starting/stopping concurrently
export class ServerAddOn {
  private owners: Set<string>;

  constructor(
    public readonly path: string,
    private readonly cleanup: ServerAddOnCleanup,
    initialOwner: string,
  ) {
    this.owners = new Set(initialOwner);
  }

  static async start(path: string, initialOwner: string): Promise<ServerAddOn> {
    console.info('ServerAddOn.start', path);

    const {serverAddOn} = requireDynamically(path) as ServerAddOnModule;
    assertNotNull(serverAddOn);
    assert(
      typeof serverAddOn === 'function',
      `ServerAddOn ${path} must export "serverAddOn" function.`,
    );

    const cleanup = await serverAddOn();
    assert(
      typeof cleanup === 'function',
      `ServerAddOn ${path} must return a clean up function, instead it returned ${typeof cleanup}.`,
    );

    return new ServerAddOn(path, cleanup, initialOwner);
  }

  addOwner(owner: string) {
    this.owners.add(owner);
  }

  removeOwner(owner: string) {
    this.owners.delete(owner);

    if (!this.owners.size) {
      this.stop().catch((e) => {
        console.error(
          'ServerAddOn.removeOwner -> failed to stop automatically when no owners left',
          this.path,
          e,
        );
      });
    }
  }

  private async stop() {
    console.info('ServerAddOn.stop', this.path);
    try {
      await this.cleanup();
    } catch (e) {
      console.error('ServerAddOn.stop -> failed to clean up', this.path);
    }
  }
}
