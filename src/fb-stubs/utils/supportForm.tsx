/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Groups} from '../../reducers/supportForm';
import {State as PluginStatesState} from '../../reducers/pluginStates';
import {State as PluginMessageQueueState} from '../../reducers/pluginMessageQueue';
import {State as PluginState} from '../../reducers/plugins';
import Client from '../../Client';

export function defaultSelectedPluginsForGroup(
  _grp: Groups,
  _pluginStates: PluginStatesState,
  _pluginMessageQueue: PluginMessageQueueState,
  _plugins: PluginState,
  _selectedClient: Client | undefined,
): Array<string> {
  return [];
}
