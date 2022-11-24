/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {PluginClient, createState, createDataSource} from 'flipper-plugin';
import {
  Events,
  Id,
  Metadata,
  MetadataId,
  PerfStatsEvent,
  Snapshot,
  TreeState,
  UINode,
} from './types';
import './node_modules/react-complex-tree/lib/style.css';

export function plugin(client: PluginClient<Events>) {
  const rootId = createState<Id | undefined>(undefined);
  const metadata = createState<Map<MetadataId, Metadata>>(new Map());
  const searchTerm = createState<string>('');

  client.onMessage('init', (event) => {
    rootId.set(event.rootId);
  });

  client.onMessage('metadataUpdate', (event) => {
    if (!event.attributeMetadata) {
      return;
    }
    metadata.update((draft) => {
      for (const [_key, value] of Object.entries(event.attributeMetadata)) {
        draft.set(value.id, value);
      }
    });
  });

  const perfEvents = createDataSource<PerfStatsEvent, 'txId'>([], {
    key: 'txId',
    limit: 10 * 1024,
  });
  client.onMessage('perfStats', (event) => {
    perfEvents.append(event);
  });

  const focusedNode = createState<Id | undefined>(undefined);

  const nodes = createState<Map<Id, UINode>>(new Map());
  const snapshot = createState<{nodeId: Id; base64Image: Snapshot} | null>(
    null,
  );

  const treeState = createState<TreeState>({expandedNodes: []});

  //The reason for the array as that user could be hovering multiple overlapping nodes at once in the visualiser.
  //The nodes are sorted by area since you most likely want to select the smallest node under your cursor
  const hoveredNodes = createState<Id[]>([]);

  client.onMessage('coordinateUpdate', (event) => {
    nodes.update((draft) => {
      const node = draft.get(event.nodeId);
      if (!node) {
        console.warn(`Coordinate update for non existing node `, event);
      } else {
        node.bounds.x = event.coordinate.x;
        node.bounds.y = event.coordinate.y;
      }
    });
  });

  const seenNodes = new Set<Id>();
  client.onMessage('subtreeUpdate', (event) => {
    if (event.snapshot) {
      snapshot.set({nodeId: event.rootId, base64Image: event.snapshot});
    }

    nodes.update((draft) => {
      event.nodes.forEach((node) => {
        draft.set(node.id, node);
      });
    });

    treeState.update((draft) => {
      for (const node of event.nodes) {
        if (!seenNodes.has(node.id)) {
          draft.expandedNodes.push(node.id);
        }
        seenNodes.add(node.id);

        if (node.activeChild) {
          const inactiveChildren = node.children.filter(
            (child) => child !== node.activeChild,
          );

          draft.expandedNodes = draft.expandedNodes.filter(
            (nodeId) => !inactiveChildren.includes(nodeId),
          );
          draft.expandedNodes.push(node.activeChild);
        }
      }
    });
  });

  return {
    rootId,
    nodes,
    metadata,
    focusedNode,
    snapshot,
    hoveredNodes,
    perfEvents,
    treeState,
    searchTerm,
  };
}

export {Component} from './components/main';
