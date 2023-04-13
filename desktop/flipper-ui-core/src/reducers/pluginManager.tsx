/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import type {Actions} from './';
import type {ActivatablePluginDetails} from 'flipper-common';
import type {PluginDefinition} from '../plugin';
import {produce} from 'immer';

export type State = {
  pluginCommandsQueue: PluginCommand[];
};

export type PluginCommand =
  | LoadPluginAction
  | UninstallPluginAction
  | SwitchPluginAction;

export type LoadPluginActionPayload = {
  plugin: ActivatablePluginDetails;
  enable: boolean;
  notifyIfFailed: boolean;
};

export type LoadPluginAction = {
  type: 'LOAD_PLUGIN';
  payload: LoadPluginActionPayload;
};

export type UninstallPluginActionPayload = {
  plugin: PluginDefinition;
};

export type UninstallPluginAction = {
  type: 'UNINSTALL_PLUGIN';
  payload: UninstallPluginActionPayload;
};

export type UpdatePluginActionPayload = {
  plugin: PluginDefinition;
  enablePlugin: boolean;
};

export type SwitchPluginActionPayload = {
  plugin: PluginDefinition;
  selectedApp?: string;
};

export type SwitchPluginAction = {
  type: 'SWITCH_PLUGIN';
  payload: SwitchPluginActionPayload;
};

export type Action =
  | {
      type: 'PLUGIN_COMMANDS_PROCESSED';
      payload: number;
    }
  | PluginCommand;

const INITIAL_STATE: State = {
  pluginCommandsQueue: [],
};

export default function reducer(
  state: State = INITIAL_STATE,
  action: Actions,
): State {
  switch (action.type) {
    case 'LOAD_PLUGIN':
    case 'UNINSTALL_PLUGIN':
    case 'SWITCH_PLUGIN':
      return produce(state, (draft) => {
        draft.pluginCommandsQueue.push(action);
      });
    case 'PLUGIN_COMMANDS_PROCESSED':
      return produce(state, (draft) => {
        draft.pluginCommandsQueue.splice(0, action.payload);
      });
    default:
      return state;
  }
}

export const uninstallPlugin = (
  payload: UninstallPluginActionPayload,
): Action => ({
  type: 'UNINSTALL_PLUGIN',
  payload,
});

export const loadPlugin = (payload: LoadPluginActionPayload): Action => ({
  type: 'LOAD_PLUGIN',
  payload,
});

export const pluginCommandsProcessed = (payload: number): Action => ({
  type: 'PLUGIN_COMMANDS_PROCESSED',
  payload,
});

export const switchPlugin = (payload: SwitchPluginActionPayload): Action => ({
  type: 'SWITCH_PLUGIN',
  payload,
});
