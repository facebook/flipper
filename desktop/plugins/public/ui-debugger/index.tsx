/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {PluginClient, createState, createDataSource} from 'flipper-plugin';
import {Events, Id, PerfStatsEvent, Snapshot, UINode} from './types';

export function plugin(client: PluginClient<Events>) {
  const rootId = createState<Id | undefined>(undefined);
  client.onMessage('init', (root) => rootId.set(root.rootId));

  const perfEvents = createDataSource<PerfStatsEvent, 'txId'>([], {
    key: 'txId',
    limit: 10 * 1024,
  });
  client.onMessage('perfStats', (event) => {
    perfEvents.append(event);
  });

  const nodesAtom = createState<Map<Id, UINode>>(new Map());
  const snapshotsAtom = createState<Map<Id, Snapshot>>(new Map());
  client.onMessage('subtreeUpdate', (event) => {
    snapshotsAtom.update((draft) => {
      draft.set(event.rootId, event.snapshot);
    });
    nodesAtom.update((draft) => {
      for (const node of event.nodes) {
        draft.set(node.id, node);
      }
    });
  });

  return {rootId, snapshots: snapshotsAtom, nodes: nodesAtom, perfEvents};
}

export {Component} from './components/main';
