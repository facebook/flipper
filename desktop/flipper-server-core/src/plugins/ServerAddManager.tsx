/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  ClientResponseType,
  ExecuteMessage,
  FlipperServerForServerAddOn,
  ServerAddOnStartDetails,
} from 'flipper-common';
import {assertNotNull} from '../app-connectivity/Utilities';
import {StateMachine} from '../utils/StateMachine';
import {ServerAddOn} from './ServerAddOn';

type TState =
  | 'inactive'
  | 'starting'
  | 'active'
  | 'fatal'
  | 'stopping'
  | 'zombie';

export class ServerAddOnManager {
  public readonly state = new StateMachine<TState, 'fatal'>('inactive');
  private _serverAddOn?: ServerAddOn;
  constructor(
    public readonly pluginName: string,
    details: ServerAddOnStartDetails,
    initialOwner: string,
    flipperServer: FlipperServerForServerAddOn,
  ) {
    this.startServerAddOn(details, initialOwner, flipperServer);
  }

  sendExpectResponse(message: ExecuteMessage): Promise<ClientResponseType> {
    if (!this.state.is('active')) {
      console.info(
        'StateAddOnManager.sendExpectResponse -> error: server add-on is not active, Current state:',
        this.state.currentState,
      );
      throw new Error(
        'StateAddOnManager.sendExpectResponse -> error: server add-on is not active',
      );
    }
    assertNotNull(
      this._serverAddOn,
      'StateAddOnManager.sendExpectResponse -> _serverAddOn is undefined',
    );
    return this._serverAddOn.connection.sendExpectResponse(message);
  }

  async addOwner(owner: string) {
    if (this.state.is('starting')) {
      await this.state.wait(['active', 'fatal']);
    }

    if (!this.state.is('active')) {
      console.info(
        'StateAddOnManager.addOwner -> error: server add-on is not active, Current state:',
        this.state.currentState,
      );
      throw new Error(
        'StateAddOnManager.addOwner -> error: server add-on is not active',
      );
    }
    assertNotNull(
      this._serverAddOn,
      'StateAddOnManager.addOwner -> _serverAddOn is undefined',
    );

    this._serverAddOn.addOwner(owner);
  }

  async removeOwner(owner: string) {
    if (this.state.is(['stopping', 'inactive'])) {
      return this.state.wait(['zombie', 'inactive']);
    }

    if (this.state.is('starting')) {
      await this.state.wait(['active', 'fatal']);
    }

    if (!this.state.is('active')) {
      console.debug(
        'StateAddOnManager.removeOwner -> error: server add-on failed to start, Current state:',
        this.state.currentState,
      );
      return;
    }

    assertNotNull(
      this._serverAddOn,
      'StateAddOnManager.addOwner -> _serverAddOn is undefined',
    );

    const stopping = this._serverAddOn.removeOwner(owner);

    if (stopping) {
      this.state.set('stopping');
      try {
        await stopping;
        this.state.set('inactive');
      } catch (e) {
        this.state.set('zombie');
        console.error(
          'ServerAddOnManager.removeOwner -> server add-on failed to clean up',
          this.pluginName,
          e,
        );
        throw e;
      }
    }
  }

  private async startServerAddOn(
    details: ServerAddOnStartDetails,
    initialOwner: string,
    flipperServer: FlipperServerForServerAddOn,
  ) {
    try {
      this.state.set('starting');

      this._serverAddOn = await ServerAddOn.start(
        this.pluginName,
        details,
        initialOwner,
        flipperServer,
      );

      this.state.set('active');
    } catch (e) {
      this.state.set('fatal', e);
      console.error(
        'StateAddOnManager.startServerAddOn -> error',
        this.pluginName,
        details,
        initialOwner,
        e,
      );
    }
  }
}
