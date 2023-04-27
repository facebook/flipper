/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  Atom,
  createDataSource,
  createState,
  PluginClient,
  produce,
} from 'flipper-plugin';
import {
  Events,
  FrameworkEvent,
  FrameworkEventType,
  Id,
  Metadata,
  MetadataId,
  PerformanceStatsEvent,
  Snapshot,
  StreamInterceptorError,
  StreamState,
  SubtreeUpdateEvent,
  UINode,
} from './types';
import {Draft} from 'immer';
import {QueryClient, setLogger} from 'react-query';
import {tracker} from './tracker';
import {getStreamInterceptor} from './fb-stubs/StreamInterceptor';

type SnapshotInfo = {nodeId: Id; base64Image: Snapshot};
type LiveClientState = {
  snapshotInfo: SnapshotInfo | null;
  nodes: Map<Id, UINode>;
};

type PendingData = {
  metadata: Record<MetadataId, Metadata>;
  frame: SubtreeUpdateEvent | null;
};

type UIState = {
  isPaused: Atom<boolean>;
  streamState: Atom<StreamState>;
  searchTerm: Atom<string>;
  isContextMenuOpen: Atom<boolean>;
  hoveredNodes: Atom<Id[]>;
  selectedNode: Atom<Id | undefined>;
  highlightedNodes: Atom<Set<Id>>;
  focusedNode: Atom<Id | undefined>;
  expandedNodes: Atom<Set<Id>>;
  visualiserWidth: Atom<number>;
  frameworkEventMonitoring: Atom<Map<FrameworkEventType, boolean>>;
};

export function plugin(client: PluginClient<Events>) {
  const rootId = createState<Id | undefined>(undefined);

  const metadata = createState<Map<MetadataId, Metadata>>(new Map());
  const streamInterceptor = getStreamInterceptor();

  const device = client.device.os;

  client.onMessage('init', (event) => {
    rootId.set(event.rootId);
    uiState.frameworkEventMonitoring.update((draft) => {
      event.frameworkEventMetadata?.forEach((frameworkEventMeta) => {
        draft.set(frameworkEventMeta.type, false);
      });
    });
  });

  async function processMetadata(
    incomingMetadata: Record<MetadataId, Metadata>,
  ) {
    const mappedMeta = await Promise.all(
      Object.values(incomingMetadata).map((metadata) =>
        streamInterceptor.transformMetadata(metadata),
      ),
    );

    metadata.update((draft) => {
      for (const metadata of mappedMeta) {
        draft.set(metadata.id, metadata);
      }
    });
  }

  //this holds pending any pending data that needs to be applied in the event of a stream interceptor error
  //while in the error state more metadata or a more recent frame may come in so both cases need to apply the same darta
  const pendingData: PendingData = {frame: null, metadata: {}};

  function handleStreamError(source: 'Frame' | 'Metadata', error: any) {
    if (error instanceof StreamInterceptorError) {
      const retryCallback = async () => {
        uiState.streamState.set({state: 'RetryingAfterError'});

        await processMetadata(pendingData.metadata);
        if (pendingData.frame != null) {
          await processSubtreeUpdate(pendingData.frame);
        }
        uiState.streamState.set({state: 'Ok'});
        pendingData.frame = null;
        pendingData.metadata = {};
      };

      uiState.streamState.set({
        state: 'StreamInterceptorRetryableError',
        retryCallback: retryCallback,
        error: error,
      });
    } else {
      console.error(
        `[ui-debugger] Unexpected Error processing ${source}`,
        error,
      );

      uiState.streamState.set({state: 'UnrecoverableError'});
    }
  }

  client.onMessage('metadataUpdate', async (event) => {
    if (!event.attributeMetadata) {
      return;
    }

    try {
      await processMetadata(event.attributeMetadata);
    } catch (error) {
      for (const metadata of Object.values(event.attributeMetadata)) {
        pendingData.metadata[metadata.id] = metadata;
      }
      handleStreamError('Metadata', error);
    }
  });

  const perfEvents = createDataSource<PerformanceStatsEvent, 'txId'>([], {
    key: 'txId',
    limit: 10 * 1024,
  });

  /**
   * The message handling below is a temporary measure for a couple of weeks until
   * clients migrate to the newer message/format.
   */
  client.onMessage('perfStats', (event) => {
    const stat = {
      txId: event.txId,
      observerType: event.observerType,
      nodesCount: event.nodesCount,
      start: event.start,
      traversalMS: event.traversalComplete - event.start,
      snapshotMS: event.snapshotComplete - event.traversalComplete,
      queuingMS: event.queuingComplete - event.snapshotComplete,
      deferredComputationMS:
        event.deferredComputationComplete - event.queuingComplete,
      serializationMS:
        event.serializationComplete - event.deferredComputationComplete,
      socketMS: event.socketComplete - event.serializationComplete,
    };
    client.logger.track('performance', 'subtreeUpdate', stat, 'ui-debugger');
    perfEvents.append(stat);
  });
  client.onMessage('performanceStats', (event) => {
    client.logger.track('performance', 'subtreeUpdate', event, 'ui-debugger');
    perfEvents.append(event);
  });

  const nodesAtom = createState<Map<Id, UINode>>(new Map());
  const frameworkEvents = createState<Map<Id, FrameworkEvent[]>>(new Map());

  const highlightedNodes = createState(new Set<Id>());
  const snapshot = createState<SnapshotInfo | null>(null);

  const uiState: UIState = {
    //used to disabled hover effects which cause rerenders and mess up the existing context menu
    isContextMenuOpen: createState<boolean>(false),

    streamState: createState<StreamState>({state: 'Ok'}),
    visualiserWidth: createState(Math.min(window.innerWidth / 4.5, 500)),

    highlightedNodes,

    selectedNode: createState<Id | undefined>(undefined),
    //used to indicate whether we will higher the visualizer / tree when a matching event comes in
    //also whether or not will show running total  in the tree
    frameworkEventMonitoring: createState(
      new Map<FrameworkEventType, boolean>(),
    ),

    isPaused: createState(false),

    //The reason for the array as that user could be hovering multiple overlapping nodes at once in the visualiser.
    //The nodes are sorted by area since you most likely want to select the smallest node under your cursor
    hoveredNodes: createState<Id[]>([]),

    searchTerm: createState<string>(''),
    focusedNode: createState<Id | undefined>(undefined),
    expandedNodes: createState<Set<Id>>(new Set()),
  };

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
      nodesAtom.set(liveClientData.nodes);
      snapshot.set(liveClientData.snapshotInfo);
      checkFocusedNodeStillActive(uiState, nodesAtom.get());
    }
  };

  //this is the client data is what drives all of desktop UI
  //it is always up-to-date with the client regardless of whether we are paused or not
  let liveClientData: LiveClientState = {
    snapshotInfo: null,
    nodes: new Map(),
  };

  const seenNodes = new Set<Id>();
  const processSubtreeUpdate = async (subtreeUpdate: SubtreeUpdateEvent) => {
    try {
      const processedNodes = await streamInterceptor.transformNodes(
        new Map(subtreeUpdate.nodes.map((node) => [node.id, {...node}])),
      );
      applyFrameData(processedNodes, {
        nodeId: subtreeUpdate.rootId,
        base64Image: subtreeUpdate.snapshot,
      });

      applyFrameworkEvents(subtreeUpdate);
    } catch (error) {
      pendingData.frame = subtreeUpdate;
      handleStreamError('Frame', error);
    }
  };

  function applyFrameworkEvents(subtreeUpdate: SubtreeUpdateEvent) {
    frameworkEvents.update((draft) => {
      if (subtreeUpdate.frameworkEvents) {
        subtreeUpdate.frameworkEvents.forEach((frameworkEvent) => {
          if (
            uiState.frameworkEventMonitoring.get().get(frameworkEvent.type) ===
              true &&
            uiState.isPaused.get() === false
          ) {
            highlightedNodes.update((draft) => {
              draft.add(frameworkEvent.nodeId);
            });
          }

          const frameworkEventsForNode = draft.get(frameworkEvent.nodeId);
          if (frameworkEventsForNode) {
            frameworkEventsForNode.push(frameworkEvent);
          } else {
            draft.set(frameworkEvent.nodeId, [frameworkEvent]);
          }
        });
        setTimeout(() => {
          highlightedNodes.update((laterDraft) => {
            for (const event of subtreeUpdate.frameworkEvents!!.values()) {
              laterDraft.delete(event.nodeId);
            }
          });
        }, HighlightTime);
      }
    });
  }

  //todo deal with racecondition, where bloks screen is fetching, takes time then you go back get more recent frame then bloks screen comes and overrites it
  function applyFrameData(
    nodes: Map<Id, UINode>,
    snapshotInfo: SnapshotInfo | null,
  ) {
    liveClientData = produce(liveClientData, (draft) => {
      if (snapshotInfo) {
        draft.snapshotInfo = snapshotInfo;
      }

      draft.nodes = nodes;
    });

    uiState.expandedNodes.update((draft) => {
      for (const node of nodes.values()) {
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
      nodesAtom.set(liveClientData.nodes);
      snapshot.set(liveClientData.snapshotInfo);

      checkFocusedNodeStillActive(uiState, nodesAtom.get());
    }
  }
  client.onMessage('subtreeUpdate', processSubtreeUpdate);

  const queryClient = new QueryClient({});

  return {
    rootId,
    uiState,
    uiActions: uiActions(uiState, nodesAtom),
    nodes: nodesAtom,
    frameworkEvents,
    snapshot,
    metadata,
    perfEvents,
    setPlayPause,
    queryClient,
    device,
  };
}

type UIActions = {
  onHoverNode: (node: Id) => void;
  onFocusNode: (focused?: Id) => void;
  onContextMenuOpen: (open: boolean) => void;
  onSelectNode: (node?: Id) => void;
  onExpandNode: (node: Id) => void;
  onCollapseNode: (node: Id) => void;
  setVisualiserWidth: (width: Id) => void;
};

function uiActions(uiState: UIState, nodes: Atom<Map<Id, UINode>>): UIActions {
  const onExpandNode = (node: Id) => {
    uiState.expandedNodes.update((draft) => {
      draft.add(node);
    });
  };
  const onSelectNode = (node?: Id) => {
    uiState.selectedNode.set(node);
    if (node) {
      const selectedNode = nodes.get().get(node);
      const tags = selectedNode?.tags;
      if (tags) {
        tracker.track('node-selected', {name: selectedNode.name, tags});
      }
    }

    let current = node;
    // expand entire ancestory in case it has been manually collapsed
    uiState.expandedNodes.update((expandedNodesDraft) => {
      while (current != null) {
        expandedNodesDraft.add(current);
        current = nodes.get().get(current)?.parent;
      }
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
    tracker.track('context-menu-opened', {});
    uiState.isContextMenuOpen.set(open);
  };

  const onFocusNode = (node?: Id) => {
    if (node) {
      const focusedNode = nodes.get().get(node);
      const tags = focusedNode?.tags;
      if (tags) {
        tracker.track('node-focused', {name: focusedNode.name, tags});
      }
    }

    uiState.focusedNode.set(node);
  };

  const setVisualiserWidth = (width: number) => {
    console.log('w', width);
    uiState.visualiserWidth.set(width);
  };

  return {
    onExpandNode,
    onCollapseNode,
    onHoverNode,
    onSelectNode,
    onContextMenuOpen,
    onFocusNode,
    setVisualiserWidth,
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

const HighlightTime = 300;

export {Component} from './components/main';
export * from './types';

setLogger({
  log: (...args) => {
    console.log(...args);
  },
  warn: (...args) => {
    console.warn(...args);
  },
  error: (...args) => {
    //downgrade react query network errors to warning so they dont get sent to scribe
    console.warn(...args);
  },
});
