/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {DevicePluginMap, ClientPluginMap, PluginDefinition} from '../plugin';
import {PluginDetails} from 'flipper-plugin-lib';
import {Actions} from '.';
import produce from 'immer';
import {isDevicePluginDefinition} from '../utils/pluginUtils';

export type State = {
  devicePlugins: DevicePluginMap;
  clientPlugins: ClientPluginMap;
  gatekeepedPlugins: Array<PluginDetails>;
  disabledPlugins: Array<PluginDetails>;
  failedPlugins: Array<[PluginDetails, string]>;
  selectedPlugins: Array<string>;
};

export type RegisterPluginAction = {
  type: 'REGISTER_PLUGINS';
  payload: PluginDefinition[];
};

export type Action =
  | RegisterPluginAction
  | {
      type: 'GATEKEEPED_PLUGINS';
      payload: Array<PluginDetails>;
    }
  | {
      type: 'DISABLED_PLUGINS';
      payload: Array<PluginDetails>;
    }
  | {
      type: 'FAILED_PLUGINS';
      payload: Array<[PluginDetails, string]>;
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
    return produce(state, (draft) => {
      const {devicePlugins, clientPlugins} = draft;
      action.payload.forEach((p) => {
        if (devicePlugins.has(p.id) || clientPlugins.has(p.id)) {
          return;
        }

        if (isDevicePluginDefinition(p)) {
          devicePlugins.set(p.id, p);
        } else {
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

export const registerPlugins = (payload: PluginDefinition[]): Action => ({
  type: 'REGISTER_PLUGINS',
  payload,
});

export const addGatekeepedPlugins = (
  payload: Array<PluginDetails>,
): Action => ({
  type: 'GATEKEEPED_PLUGINS',
  payload,
});

export const addDisabledPlugins = (payload: Array<PluginDetails>): Action => ({
  type: 'DISABLED_PLUGINS',
  payload,
});

export const addFailedPlugins = (
  payload: Array<[PluginDetails, string]>,
): Action => ({
  type: 'FAILED_PLUGINS',
  payload,
});
