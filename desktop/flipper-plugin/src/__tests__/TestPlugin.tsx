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

type Events = {
  inc: {
    delta: number;
  };
};

type Methods = {
  currentState(): Promise<number>;
};

export function plugin(client: FlipperClient<Events, Methods>) {
  const connectStub = jest.fn();
  const disconnectStub = jest.fn();
  const destroyStub = jest.fn();

  // TODO: add tests for sending and receiving data T68683442
  // including typescript assertions

  client.onConnect(connectStub);
  client.onDisconnect(disconnectStub);
  client.onDestroy(destroyStub);

  return {
    connectStub,
    destroyStub,
    disconnectStub,
  };
}

export function Component() {
  // TODO T69105011 add test for usePlugin including type assertions
  return <h1>Hi from test plugin</h1>;
}
