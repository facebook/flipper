/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  PluginDetails,
  DownloadablePluginDetails,
  BundledPluginDetails,
} from 'flipper-plugin-lib';
import {Actions} from '.';
import {
  DevicePluginDefinition,
  ClientPluginDefinition,
  PluginDefinition,
} from '../plugin';
import produce from 'immer';

export type State = {
  devicePlugins: DevicePluginDefinition[];
  metroPlugins: DevicePluginDefinition[];
  enabledPlugins: ClientPluginDefinition[];
  disabledPlugins: PluginDefinition[];
  unavailablePlugins: [plugin: PluginDetails, reason: string][];
  downloadablePlugins: (DownloadablePluginDetails | BundledPluginDetails)[];
};

const INITIAL_STATE: State = {
  devicePlugins: [],
  metroPlugins: [],
  enabledPlugins: [],
  disabledPlugins: [],
  unavailablePlugins: [],
  downloadablePlugins: [],
};

export type Action = {
  type: 'PLUGIN_LISTS_CHANGED';
  payload: State;
};

export default function reducer(
  state: State | undefined = INITIAL_STATE,
  action: Actions,
): State {
  if (action.type === 'PLUGIN_LISTS_CHANGED') {
    const payload = action.payload;
    return produce(state, (draft) => {
      draft.devicePlugins = payload.devicePlugins;
      draft.metroPlugins = payload.metroPlugins;
      draft.enabledPlugins = payload.enabledPlugins;
      draft.disabledPlugins = payload.disabledPlugins;
      draft.unavailablePlugins = payload.unavailablePlugins;
      draft.downloadablePlugins = payload.downloadablePlugins;
    });
  } else {
    return state;
  }
}

export const pluginListsChanged = (payload: State): Action => ({
  type: 'PLUGIN_LISTS_CHANGED',
  payload,
});
