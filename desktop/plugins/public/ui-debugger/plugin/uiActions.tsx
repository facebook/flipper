/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Atom, PluginClient} from 'flipper-plugin';
import {debounce} from 'lodash';
import {
  ClientNode,
  Events,
  FrameworkEventType,
  Id,
  Methods,
  SnapshotInfo,
} from '../ClientTypes';
import {
  TraversalMode,
  LiveClientState,
  SelectionSource,
  UIActions,
  UIState,
  ViewMode,
  WireFrameMode,
} from '../DesktopTypes';
import {tracker} from '../utils/tracker';
import {checkFocusedNodeStillActive} from './ClientDataUtils';

export function uiActions(
  uiState: UIState,
  nodes: Atom<Map<Id, ClientNode>>,
  snapshot: Atom<SnapshotInfo | null>,
  liveClientData: LiveClientState,
  client: PluginClient<Events, Methods>,
): UIActions {
  const onExpandNode = (node: Id) => {
    uiState.expandedNodes.update((draft) => {
      draft.add(node);
    });
  };
  const onSelectNode = (node: Id | undefined, source: SelectionSource) => {
    if (
      node == null ||
      (uiState.selectedNode.get()?.id === node && source !== 'context-menu')
    ) {
      uiState.selectedNode.set(undefined);
    } else {
      uiState.selectedNode.set({id: node, source});
    }

    if (node) {
      const selectedNode = nodes.get().get(node);
      const tags = selectedNode?.tags;
      if (tags) {
        tracker.track('node-selected', {
          name: selectedNode.name,
          tags,
          source: source,
        });
      }

      let current = selectedNode?.parent;
      // expand entire ancestory in case it has been manually collapsed
      uiState.expandedNodes.update((expandedNodesDraft) => {
        while (current != null) {
          expandedNodesDraft.add(current);
          current = nodes.get().get(current)?.parent;
        }
      });
    }
  };

  const onCollapseNode = (node: Id) => {
    uiState.expandedNodes.update((draft) => {
      draft.delete(node);
    });
  };

  const onHoverNode = (...node: Id[]) => {
    if (node != null) {
      uiState.hoveredNodes.set(node);
    } else {
      uiState.hoveredNodes.set([]);
    }
  };

  const onContextMenuOpen = (open: boolean) => {
    tracker.track('context-menu-opened', {});
    uiState.isContextMenuOpen.set(open);
  };

  const onCollapseAllNonAncestors = (nodeId: Id) => {
    uiState.expandedNodes.update((draft) => {
      draft.clear();
    });
    ensureAncestorsExpanded(nodeId);
  };

  const ensureAncestorsExpanded = (nodeId: Id) => {
    uiState.expandedNodes.update((draft) => {
      const nodesMap = nodes.get();

      let curNode = nodesMap.get(nodeId);
      while (curNode != null) {
        draft.add(curNode.id);
        curNode = nodesMap.get(curNode?.parent ?? 'Nonode');
      }
    });
  };

  function treeTraverseUtil(
    nodeID: Id,
    nodeVisitor: (node: ClientNode) => void,
  ) {
    const nodesMap = nodes.get();

    const node = nodesMap.get(nodeID);
    if (node != null) {
      nodeVisitor(node);
      for (const childId of node.children) {
        treeTraverseUtil(childId, nodeVisitor);
      }
    }
  }

  const onExpandAllRecursively = (nodeId: Id) => {
    uiState.expandedNodes.update((draft) => {
      treeTraverseUtil(nodeId, (node) => draft.add(node.id));
    });
  };

  const onCollapseAllRecursively = (nodeId: Id) => {
    uiState.expandedNodes.update((draft) => {
      treeTraverseUtil(nodeId, (node) => draft.delete(node.id));
    });
  };

  const onFocusNode = (node?: Id) => {
    if (node != null) {
      const focusedNode = nodes.get().get(node);
      const tags = focusedNode?.tags;
      if (tags) {
        tracker.track('node-focused', {name: focusedNode.name, tags});
      }

      uiState.selectedNode.set({id: node, source: 'visualiser'});
    }

    uiState.focusedNode.set(node);
  };

  const setVisualiserWidth = (width: number) => {
    uiState.visualiserWidth.set(width);
  };

  const onSetFilterMainThreadMonitoring = (toggled: boolean) => {
    uiState.filterMainThreadMonitoring.set(toggled);
  };

  const onSetViewMode = (viewMode: ViewMode) => {
    uiState.viewMode.set(viewMode);
  };

  const onSetWireFrameMode = (wireFrameMode: WireFrameMode) => {
    uiState.wireFrameMode.set(wireFrameMode);
  };

  const onSetFrameworkEventMonitored = (
    eventType: FrameworkEventType,
    monitored: boolean,
  ) => {
    tracker.track('framework-event-monitored', {eventType, monitored});
    uiState.frameworkEventMonitoring.update((draft) =>
      draft.set(eventType, monitored),
    );
  };

  const onPlayPauseToggled = () => {
    const isPaused = !uiState.isPaused.get();
    tracker.track('play-pause-toggled', {paused: isPaused});
    uiState.isPaused.set(isPaused);
    if (!isPaused) {
      nodes.set(liveClientData.nodes);
      snapshot.set(liveClientData.snapshotInfo);
      checkFocusedNodeStillActive(uiState, nodes.get());
    }
  };

  const searchTermUpdatedDebounced = debounce((searchTerm: string) => {
    tracker.track('search-term-updated', {searchTerm});
  }, 250);

  const onSearchTermUpdated = (searchTerm: string) => {
    uiState.searchTerm.set(searchTerm);
    searchTermUpdatedDebounced(searchTerm);
  };

  const onSetTraversalMode = (newMode: TraversalMode) => {
    tracker.track('traversal-mode-updated', {mode: newMode});
    const currentMode = uiState.traversalMode.get();
    uiState.traversalMode.set(newMode);

    try {
      client.send('onTraversalModeChange', {mode: newMode});
    } catch (err) {
      console.warn('[ui-debugger] Unable to set traversal mode', err);
      uiState.traversalMode.set(currentMode);
    }
  };

  return {
    onExpandNode,
    onCollapseNode,
    onHoverNode,
    onSelectNode,
    onContextMenuOpen,
    onFocusNode,
    setVisualiserWidth,
    onSetFilterMainThreadMonitoring,
    onSetViewMode,
    onSetFrameworkEventMonitored,
    onPlayPauseToggled,
    onSearchTermUpdated,
    onSetWireFrameMode,
    onCollapseAllNonAncestors,
    onExpandAllRecursively,
    onCollapseAllRecursively,
    ensureAncestorsExpanded,
    onSetTraversalMode,
  };
}
