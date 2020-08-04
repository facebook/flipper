/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import * as React from 'react';
import {DevicePluginClient, Device} from '../plugin/DevicePlugin';
import {usePlugin} from '../plugin/PluginContext';
import {createState, useValue} from '../state/atom';

export function supportsDevice(_device: Device) {
  return true;
}

export function devicePlugin(client: DevicePluginClient) {
  const logStub = jest.fn();
  const activateStub = jest.fn();
  const deactivateStub = jest.fn();
  const destroyStub = jest.fn();
  const state = createState(
    {
      count: 0,
    },
    {
      persist: 'counter',
    },
  );

  client.device.onLogEntry((entry) => {
    state.update((d) => {
      d.count++;
    });
    logStub(entry);
  });
  client.onActivate(activateStub);
  client.onDeactivate(deactivateStub);
  client.onDestroy(destroyStub);

  return {
    logStub,
    activateStub,
    deactivateStub,
    destroyStub,
    state,
  };
}

export function Component() {
  const api = usePlugin(devicePlugin);
  const count = useValue(api.state).count;

  // @ts-expect-error
  api.bla;

  return <h1>Hi from test plugin {count}</h1>;
}
