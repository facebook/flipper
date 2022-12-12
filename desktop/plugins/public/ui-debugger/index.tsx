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
  Atom,
} from 'flipper-plugin';
import {
  Events,
  Id,
  Metadata,
  MetadataId,
  PerfStatsEvent,
  Snapshot,
  UINode,
} from './types';
import {Draft} from 'immer';

type SnapshotInfo = {nodeId: Id; base64Image: Snapshot};
type LiveClientState = {
  snapshotInfo: SnapshotInfo | null;
  nodes: Map<Id, UINode>;
};

type UIState = {
  isPaused: Atom<boolean>;
  searchTerm: Atom<string>;
  isContextMenuOpen: Atom<boolean>;
  hoveredNodes: Atom<Id[]>;
  focusedNode: Atom<Id | undefined>;
  expandedNodes: Atom<Set<Id>>;
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

  const uiState: UIState = {
    //used to disabled hover effects which cause rerenders and mess up the existing context menu
    isContextMenuOpen: createState<boolean>(false),

    isPaused: createState(false),

    //The reason for the array as that user could be hovering multiple overlapping nodes at once in the visualiser.
    //The nodes are sorted by area since you most likely want to select the smallest node under your cursor
    hoveredNodes: createState<Id[]>([]),

    searchTerm: createState<string>(''),
    focusedNode: createState<Id | undefined>(undefined),
    expandedNodes: createState<Set<Id>>(new Set()),
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
      uiState.expandedNodes.update((draft) => {
        liveClientData.nodes.forEach((node) => {
          collapseinActiveChildren(node, draft);
        });
      });
      nodes.set(liveClientData.nodes);
      snapshot.set(liveClientData.snapshotInfo);
      checkFocusedNodeStillActive(uiState, nodes.get());
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

    uiState.expandedNodes.update((draft) => {
      for (const node of event.nodes) {
        if (!seenNodes.has(node.id)) {
          draft.add(node.id);
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

      checkFocusedNodeStillActive(uiState, nodes.get());
    }
  });

  return {
    rootId,
    uiState,
    uiActions: uiActions(uiState),
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

type UIActions = {
  onHoverNode: (node: Id) => void;
  onFocusNode: (focused?: Id) => void;
  onContextMenuOpen: (open: boolean) => void;
  onExpandNode: (node: Id) => void;
  onCollapseNode: (node: Id) => void;
};

function uiActions(uiState: UIState): UIActions {
  const onExpandNode = (node: Id) => {
    uiState.expandedNodes.update((draft) => {
      draft.add(node);
    });
  };

  const onCollapseNode = (node: Id) => {
    uiState.expandedNodes.update((draft) => {
      draft.delete(node);
    });
  };

  const onHoverNode = (node: Id) => {
    uiState.hoveredNodes.set([node]);
  };

  const onContextMenuOpen = (open: boolean) => {
    uiState.isContextMenuOpen.set(open);
  };

  const onFocusNode = (focused?: Id) => {
    uiState.focusedNode.set(focused);
  };

  return {
    onExpandNode,
    onCollapseNode,
    onHoverNode,
    onContextMenuOpen,
    onFocusNode,
  };
}

function checkFocusedNodeStillActive(uiState: UIState, nodes: Map<Id, UINode>) {
  const focusedNodeId = uiState.focusedNode.get();
  const focusedNode = focusedNodeId && nodes.get(focusedNodeId);
  if (focusedNode && !isFocusedNodeAncestryAllActive(focusedNode, nodes)) {
    uiState.focusedNode.set(undefined);
  }
}

function isFocusedNodeAncestryAllActive(
  focused: UINode,
  nodes: Map<Id, UINode>,
): boolean {
  let node = focused;

  while (node != null) {
    if (node.parent == null) {
      return true;
    }

    const parent = nodes.get(node.parent);

    if (parent == null) {
      //should also never happen
      return false;
    }

    if (parent.activeChild != null && parent.activeChild !== node.id) {
      return false;
    }

    node = parent;
  }
  //wont happen
  return false;
}

function collapseinActiveChildren(node: UINode, expandedNodes: Draft<Set<Id>>) {
  if (node.activeChild) {
    expandedNodes.add(node.activeChild);
    for (const child of node.children) {
      if (child !== node.activeChild) {
        expandedNodes.delete(child);
      }
    }
  }
}

export {Component} from './components/main';
