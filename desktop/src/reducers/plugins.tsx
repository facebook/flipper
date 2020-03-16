/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperPlugin, FlipperDevicePlugin} from '../plugin';
import {PluginDefinition} from '../dispatcher/plugins';
import {Actions} from '.';
import produce from 'immer';

export type State = {
  devicePlugins: Map<string, typeof FlipperDevicePlugin>;
  clientPlugins: Map<string, typeof FlipperPlugin>;
  gatekeepedPlugins: Array<PluginDefinition>;
  disabledPlugins: Array<PluginDefinition>;
  failedPlugins: Array<[PluginDefinition, string]>;
  selectedPlugins: Array<string>;
};

type PluginClass = typeof FlipperPlugin | typeof FlipperDevicePlugin;

export type RegisterPluginAction = {
  type: 'REGISTER_PLUGINS';
  payload: Array<PluginClass>;
};

export type Action =
  | RegisterPluginAction
  | {
      type: 'GATEKEEPED_PLUGINS';
      payload: Array<PluginDefinition>;
    }
  | {
      type: 'DISABLED_PLUGINS';
      payload: Array<PluginDefinition>;
    }
  | {
      type: 'FAILED_PLUGINS';
      payload: Array<[PluginDefinition, string]>;
    }
  | {
      type: 'SELECTED_PLUGINS';
      payload: Array<string>;
    };

const INITIAL_STATE: State = {
  devicePlugins: new Map(),
  clientPlugins: new Map(),
  gatekeepedPlugins: [],
  disabledPlugins: [],
  failedPlugins: [],
  selectedPlugins: [],
};

export default function reducer(
  state: State | undefined = INITIAL_STATE,
  action: Actions,
): State {
  if (action.type === 'REGISTER_PLUGINS') {
    return produce(state, draft => {
      const {devicePlugins, clientPlugins} = draft;
      action.payload.forEach((p: PluginClass) => {
        if (devicePlugins.has(p.id) || clientPlugins.has(p.id)) {
          return;
        }

        if (p.prototype instanceof FlipperDevicePlugin) {
          // @ts-ignore doesn't know p must be typeof FlipperDevicePlugin here
          devicePlugins.set(p.id, p);
        } else if (p.prototype instanceof FlipperPlugin) {
          // @ts-ignore doesn't know p must be typeof FlipperPlugin here
          clientPlugins.set(p.id, p);
        }
      });
    });
  } else if (action.type === 'GATEKEEPED_PLUGINS') {
    return {
      ...state,
      gatekeepedPlugins: state.gatekeepedPlugins.concat(action.payload),
    };
  } else if (action.type === 'DISABLED_PLUGINS') {
    return {
      ...state,
      disabledPlugins: state.disabledPlugins.concat(action.payload),
    };
  } else if (action.type === 'FAILED_PLUGINS') {
    return {
      ...state,
      failedPlugins: state.failedPlugins.concat(action.payload),
    };
  } else if (action.type === 'SELECTED_PLUGINS') {
    return {
      ...state,
      selectedPlugins: action.payload,
    };
  } else {
    return state;
  }
}

export const selectedPlugins = (payload: Array<string>): Action => ({
  type: 'SELECTED_PLUGINS',
  payload,
});

export const registerPlugins = (payload: Array<PluginClass>): Action => ({
  type: 'REGISTER_PLUGINS',
  payload,
});

export const addGatekeepedPlugins = (
  payload: Array<PluginDefinition>,
): Action => ({
  type: 'GATEKEEPED_PLUGINS',
  payload,
});

export const addDisabledPlugins = (
  payload: Array<PluginDefinition>,
): Action => ({
  type: 'DISABLED_PLUGINS',
  payload,
});

export const addFailedPlugins = (
  payload: Array<[PluginDefinition, string]>,
): Action => ({
  type: 'FAILED_PLUGINS',
  payload,
});
