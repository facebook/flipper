/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import * as React from 'react';
import {PluginClient} from '../plugin/Plugin';
import {usePlugin} from '../plugin/PluginContext';
import {createState, useValue} from '../state/atom';

type Events = {
  inc: {
    delta: number;
  };
};

type Methods = {
  currentState(params: {since: number}): Promise<number>;
};

export function plugin(client: PluginClient<Events, Methods>) {
  const connectStub = jest.fn();
  const disconnectStub = jest.fn();
  const activateStub = jest.fn();
  const deactivateStub = jest.fn();
  const destroyStub = jest.fn();
  const readyStub = jest.fn();
  const state = createState(
    {
      count: 0,
    },
    {
      persist: 'counter',
    },
  );
  const unhandledMessages = createState<any[]>([]);

  client.onConnect(connectStub);
  client.onDisconnect(disconnectStub);
  client.onActivate(activateStub);
  client.onDeactivate(deactivateStub);
  client.onDestroy(destroyStub);
  client.onReady(readyStub);
  client.onMessage('inc', ({delta}) => {
    state.update((draft) => {
      draft.count += delta;
    });
  });
  client.onUnhandledMessage((event, params) => {
    unhandledMessages.update((draft) => {
      draft.push({event, params});
    });
  });

  function _unusedJustTypeChecks() {
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

  expect(client.device).not.toBeNull();

  return {
    activateStub,
    deactivateStub,
    connectStub,
    destroyStub,
    disconnectStub,
    readyStub,
    getCurrentState,
    state,
    unhandledMessages,
    appId: client.appId,
    appName: client.appName,
  };
}

export function Component() {
  const api = usePlugin(plugin);
  const count = useValue(api.state).count;

  // @ts-expect-error
  api.bla;

  return <h1>Hi from test plugin {count}</h1>;
}
