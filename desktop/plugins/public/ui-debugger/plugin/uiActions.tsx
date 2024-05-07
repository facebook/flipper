/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Atom, PluginClient, getFlipperLib} from 'flipper-plugin';
import {debounce, last} from 'lodash';
import {
  ClientNode,
  CompoundTypeHint,
  Events,
  FrameworkEventType,
  Id,
  Metadata,
  MetadataId,
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
  ReferenceImageAction,
  Operation,
} from '../DesktopTypes';
import {tracker} from '../utils/tracker';
import {checkFocusedNodeStillActive} from './ClientDataUtils';

export function uiActions(
  uiState: UIState,
  nodes: Atom<Map<Id, ClientNode>>,
  snapshot: Atom<SnapshotInfo | null>,
  liveClientData: LiveClientState,
  client: PluginClient<Events, Methods>,
  metadata: Atom<Map<MetadataId, Metadata>>,
): UIActions {
  const onExpandNode = (node: Id) => {
    uiState.expandedNodes.update((draft) => {
      draft.add(node);
    });
  };
  const onSelectNode = (
    node: ClientNode | undefined,
    source: SelectionSource,
  ) => {
    if (
      node == null ||
      (uiState.nodeSelection.get()?.node.id === node.id &&
        source !== 'context-menu')
    ) {
      uiState.nodeSelection.set(undefined);
    } else {
      uiState.nodeSelection.set({
        source,
        node, //last known state of the node, may be offscreen
      });
    }

    if (node != null) {
      tracker.track('node-selected', {
        name: node.name,
        tags: node.tags,
        source,
      });

      let current = node.parent;
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
      if (focusedNode == null) {
        return;
      }
      const tags = focusedNode?.tags;
      if (tags) {
        tracker.track('node-focused', {name: focusedNode.name, tags});
      }

      uiState.nodeSelection.set({
        node: focusedNode,
        source: 'visualiser',
      });
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

  const editClientAttribute = async (
    nodeId: Id,
    value: any,
    metadataIdPath: MetadataId[],
    compoundTypeHint?: CompoundTypeHint,
  ): Promise<boolean> => {
    try {
      await client.send('editAttribute', {
        nodeId,
        value,
        metadataIdPath,
        compoundTypeHint,
      });
      trackLiveEditDebounced(nodeId, metadataIdPath, value);
      return true;
    } catch (error) {
      console.warn('[ui-debugger] Failed to edit attribute', error);
      return false;
    }
  };

  const trackLiveEditDebounced = debounce(
    (nodeId: Id, metadataIdPath: MetadataId[], value: any) => {
      const node = nodes.get().get(nodeId);
      const attributePath = metadataIdPath.map(
        (id) => metadata.get().get(id)?.name ?? id.toString(),
      );

      tracker.track('attribute-editted', {
        nodeId,
        nodeName: node?.name ?? 'Unknown',
        attributeName: last(attributePath) ?? 'Unknown',
        attributePath,
        value,
        attributeType: (typeof value).toString(),
        tags: node?.tags ?? [],
      });
    },
    100,
  );

  const onReferenceImageAction = async (action: ReferenceImageAction) => {
    if (action === 'Import') {
      const fileDescriptor = await getFlipperLib().importFile({
        title: 'Select a reference image',
        extensions: ['.png'],
        encoding: 'binary',
      });

      if (fileDescriptor?.data != null) {
        const blob = new Blob([fileDescriptor.data], {type: 'image/png'});
        const imageUrl = URL.createObjectURL(blob);
        uiState.referenceImage.set({url: imageUrl, opacity: 0.7});
        tracker.track('reference-image-switched', {on: true});
      }
    } else if (action === 'Clear') {
      uiState.referenceImage.set(null);
      tracker.track('reference-image-switched', {on: false});
    } else if (typeof action === 'number') {
      uiState.referenceImage.update((draft) => {
        if (draft != null) draft.opacity = action;
      });
    }
  };

  const onChangeNodeLevelEventTypeFilter = (thread: string, op: Operation) => {
    uiState.nodeLevelFrameworkEventFilters.update((draft) => {
      if (op === 'add') {
        draft.eventTypes.add(thread);
      } else {
        draft.eventTypes.delete(thread);
      }
    });
  };

  const onChangeNodeLevelThreadFilter = (eventType: string, op: Operation) => {
    uiState.nodeLevelFrameworkEventFilters.update((draft) => {
      if (op === 'add') {
        draft.threads.add(eventType);
      } else {
        draft.threads.delete(eventType);
      }
    });
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
    onReferenceImageAction,
    onChangeNodeLevelEventTypeFilter,
    onChangeNodeLevelThreadFilter,
    editClientAttribute,
  };
}
