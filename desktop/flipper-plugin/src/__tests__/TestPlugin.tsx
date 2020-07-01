/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import * as React from 'react';
import {FlipperClient} from '../plugin/Plugin';
import {usePlugin} from '../plugin/PluginContext';

type Events = {
  inc: {
    delta: number;
  };
};

type Methods = {
  currentState(params: {since: number}): Promise<number>;
};

export function plugin(client: FlipperClient<Events, Methods>) {
  const connectStub = jest.fn();
  const disconnectStub = jest.fn();
  const destroyStub = jest.fn();
  const state = {
    count: 0,
  };

  // TODO: add tests for sending and receiving data T68683442
  // including typescript assertions

  client.onConnect(connectStub);
  client.onDisconnect(disconnectStub);
  client.onDestroy(destroyStub);
  client.onMessage('inc', ({delta}) => {
    state.count += delta;
  });

  function _unused_JustTypeChecks() {
    // @ts-expect-error Argument of type '"bla"' is not assignable
    client.send('bla', {});
    // @ts-expect-error Argument of type '{ stuff: string; }' is not assignable to parameter of type
    client.send('currentState', {stuff: 'nope'});
    // @ts-expect-error
    client.onMessage('stuff', (_params) => {
      // noop
    });
    client.onMessage('inc', (params) => {
      // @ts-expect-error
      params.bla;
    });
  }

  async function getCurrentState() {
    return client.send('currentState', {since: 0});
  }

  return {
    connectStub,
    destroyStub,
    disconnectStub,
    getCurrentState,
    state,
  };
}

export function Component() {
  const api = usePlugin(plugin);

  // @ts-expect-error
  api.bla;

  // TODO N.b.: state updates won't be visible
  return <h1>Hi from test plugin {api.state.count}</h1>;
}
