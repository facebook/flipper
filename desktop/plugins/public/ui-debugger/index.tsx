/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {PluginClient, createState} from 'flipper-plugin';

type Events = {
  init: {rootId: string};
};

export function plugin(client: PluginClient<Events>) {
  const rootId = createState<string | undefined>(undefined);
  client.onMessage('init', (root) => rootId.set(root.rootId));
  return {rootId};
}

export {Component} from './components/main';
