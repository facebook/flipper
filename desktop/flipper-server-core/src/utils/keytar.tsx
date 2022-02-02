/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import os from 'os';
import {UserNotSignedInError} from 'flipper-common';

export const SERVICE_FLIPPER = 'flipper.oAuthToken';

export type KeytarModule = {
  getPassword(service: string, username: string): string;
  deletePassword(service: string, username: string): void;
  setPassword(service: string, username: string, password: string): void;
};

export class KeytarManager {
  constructor(private keytar: KeytarModule | undefined) {}

  public async writeKeychain(service: string, password: string): Promise<void> {
    if (this.keytar == null) {
      throw new Error('Keytar is not available.');
    }

    await this.keytar.deletePassword(service, os.userInfo().username);
    await this.keytar.setPassword(service, os.userInfo().username, password);
  }

  public async unsetKeychain(service: string): Promise<void> {
    await this.keytar?.deletePassword(service, os.userInfo().username);
  }

  public async retrieveToken(service: string): Promise<string> {
    if (this.keytar == null) {
      throw new Error('Keytar is not available.');
    }
    const token = await this.keytar.getPassword(
      service,
      os.userInfo().username,
    );
    if (!token) {
      throw new UserNotSignedInError();
    }

    return token;
  }
}
