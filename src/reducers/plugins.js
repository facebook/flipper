/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {FlipperPlugin, FlipperDevicePlugin} from '../plugin.js';

export type State = {
  devicePlugins: Map<string, Class<FlipperDevicePlugin<>>>,
  clientPlugins: Map<string, Class<FlipperPlugin<>>>,
};

type P = Class<FlipperPlugin<> | FlipperDevicePlugin<>>;

export type Action = {
  type: 'REGISTER_PLUGINS',
  payload: Array<P>,
};

const INITIAL_STATE: State = {
  devicePlugins: new Map(),
  clientPlugins: new Map(),
};

export default function reducer(
  state: State = INITIAL_STATE,
  action: Action,
): State {
  if (action.type === 'REGISTER_PLUGINS') {
    const {devicePlugins, clientPlugins} = state;

    action.payload.forEach((p: P) => {
      if (devicePlugins.has(p.id) || clientPlugins.has(p.id)) {
        return;
      }

      // $FlowFixMe Flow doesn't know prototype
      if (p.prototype instanceof FlipperDevicePlugin) {
        // $FlowFixMe Flow doesn't know p must be Class<FlipperDevicePlugin> here
        devicePlugins.set(p.id, p);
      } else if (p.prototype instanceof FlipperPlugin) {
        // $FlowFixMe Flow doesn't know p must be Class<FlipperPlugin> here
        clientPlugins.set(p.id, p);
      }
    });

    return {
      ...state,
      devicePlugins,
      clientPlugins,
    };
  } else {
    return state;
  }
}

export const registerPlugins = (payload: Array<P>): Action => ({
  type: 'REGISTER_PLUGINS',
  payload,
});
