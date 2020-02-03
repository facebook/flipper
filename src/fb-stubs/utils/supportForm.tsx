/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Groups} from '../../reducers/supportForm';
import {State as PluginState} from '../../reducers/plugins';
import Client from '../../Client';

export function defaultSelectedPluginsForGroup(
  _grp: Groups,
  _plugins: PluginState,
  _selectedClient: Client | undefined,
  _userStarredPlugins: {[client: string]: Array<string>},
): Array<string> {
  return [];
}
