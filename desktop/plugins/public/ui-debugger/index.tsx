/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {PluginClient, createState, createDataSource} from 'flipper-plugin';
import {Id, UINode} from './types';

export type PerfStatsEvent = {
  txId: number;
  start: number;
  scanComplete: number;
  serializationComplete: number;
  socketComplete: number;
  nodesCount: number;
};

type Events = {
  init: {rootId: string};
  nativeScan: {txId: number; nodes: UINode[]};
  perfStats: PerfStatsEvent;
};

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
  client.onMessage('nativeScan', ({nodes}) => {
    nodesAtom.set(new Map(nodes.map((node) => [node.id, node])));
    console.log(nodesAtom.get());
  });

  return {rootId, nodes: nodesAtom, perfEvents};
}

export {Component} from './components/main';
