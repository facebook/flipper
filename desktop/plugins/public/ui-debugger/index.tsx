/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  PluginClient,
  createState,
  createDataSource,
  produce,
} from 'flipper-plugin';
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

type SnapshotInfo = {nodeId: Id; base64Image: Snapshot};
type LiveClientState = {
  snapshotInfo: SnapshotInfo | null;
  nodes: Map<Id, UINode>;
};

export function plugin(client: PluginClient<Events>) {
  const rootId = createState<Id | undefined>(undefined);
  const metadata = createState<Map<MetadataId, Metadata>>(new Map());

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
    client.logger.track('performance', 'subtreeUpdate', event, 'ui-debugger');
    perfEvents.append(event);
  });

  const nodes = createState<Map<Id, UINode>>(new Map());
  const snapshot = createState<SnapshotInfo | null>(null);

  const uiState = {
    //used to disabled hover effects which cause rerenders and mess up the existing context menu
    isContextMenuOpen: createState<boolean>(false),

    isPaused: createState(false),

    //The reason for the array as that user could be hovering multiple overlapping nodes at once in the visualiser.
    //The nodes are sorted by area since you most likely want to select the smallest node under your cursor
    hoveredNodes: createState<Id[]>([]),

    searchTerm: createState<string>(''),
    focusedNode: createState<Id | undefined>(undefined),
    treeState: createState<TreeState>({expandedNodes: []}),
  };

  client.onMessage('coordinateUpdate', (event) => {
    liveClientData = produce(liveClientData, (draft) => {
      const node = draft.nodes.get(event.nodeId);
      if (!node) {
        console.warn(`Coordinate update for non existing node `, event);
      } else {
        node.bounds.x = event.coordinate.x;
        node.bounds.y = event.coordinate.y;
      }
    });

    if (uiState.isPaused.get()) {
      return;
    }

    nodes.set(liveClientData.nodes);
  });

  const setPlayPause = (isPaused: boolean) => {
    uiState.isPaused.set(isPaused);
    if (!isPaused) {
      //When going back to play mode then set the atoms to the live state to rerender the latest
      //Also need to fixed expanded state for any change in active child state
      uiState.treeState.update((draft) => {
        liveClientData.nodes.forEach((node) => {
          collapseinActiveChildren(node, draft);
        });
      });
      nodes.set(liveClientData.nodes);
      snapshot.set(liveClientData.snapshotInfo);
    }
  };

  //this is the client data is what drives all of desktop UI
  //it is always up-to-date with the client regardless of whether we are paused or not
  let liveClientData: LiveClientState = {
    snapshotInfo: null,
    nodes: new Map(),
  };

  const seenNodes = new Set<Id>();
  client.onMessage('subtreeUpdate', (event) => {
    liveClientData = produce(liveClientData, (draft) => {
      if (event.snapshot) {
        draft.snapshotInfo = {
          nodeId: event.rootId,
          base64Image: event.snapshot,
        };
      }

      event.nodes.forEach((node) => {
        draft.nodes.set(node.id, {...node});
      });
      setParentPointers(rootId.get()!!, undefined, draft.nodes);
    });

    uiState.treeState.update((draft) => {
      for (const node of event.nodes) {
        if (!seenNodes.has(node.id)) {
          draft.expandedNodes.push(node.id);
        }
        seenNodes.add(node.id);

        if (!uiState.isPaused.get()) {
          //we need to not do this while paused as you may move to another screen / tab
          //and it would collapse the tree node for the activity you were paused on.
          collapseinActiveChildren(node, draft);
        }
      }
    });

    if (!uiState.isPaused.get()) {
      nodes.set(liveClientData.nodes);
      snapshot.set(liveClientData.snapshotInfo);
    }
  });

  return {
    rootId,
    uiState,
    nodes,
    snapshot,
    metadata,
    perfEvents,
    setPlayPause,
  };
}

function setParentPointers(
  cur: Id,
  parent: Id | undefined,
  nodes: Map<Id, UINode>,
) {
  const node = nodes.get(cur);
  if (node == null) {
    return;
  }
  node.parent = parent;
  node.children.forEach((child) => {
    setParentPointers(child, cur, nodes);
  });
}

function collapseinActiveChildren(node: UINode, draft: TreeState) {
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

export {Component} from './components/main';
