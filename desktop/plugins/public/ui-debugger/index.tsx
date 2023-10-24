/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {createDataSource, createState, PluginClient} from 'flipper-plugin';
import {
  Events,
  FrameScanEvent,
  FrameworkEventType,
  Id,
  Metadata,
  MetadataId,
  PerformanceStatsEvent,
  SnapshotInfo,
  ClientNode,
  FrameworkEventMetadata,
  Methods,
} from './ClientTypes';
import {
  UIState,
  NodeSelection,
  TraversalMode,
  StreamState,
  ReadOnlyUIState,
  LiveClientState,
  WireFrameMode,
  AugmentedFrameworkEvent,
  StreamInterceptorEventEmitter,
  Color,
} from './DesktopTypes';
import EventEmitter from 'eventemitter3';
import {addInterceptors} from './fb-stubs/StreamInterceptor';
import {prefetchSourceFileLocation} from './components/fb-stubs/IDEContextMenu';
import {checkFocusedNodeStillActive} from './plugin/ClientDataUtils';
import {uiActions} from './plugin/uiActions';
import {first} from 'lodash';
import {getNode} from './utils/map';
import {handleTraversalError} from './plugin/traversalError';

export function plugin(client: PluginClient<Events, Methods>) {
  const rootId = createState<Id | undefined>(undefined);
  const metadata = createState<Map<MetadataId, Metadata>>(new Map());

  const streamInterceptor = new EventEmitter() as StreamInterceptorEventEmitter;
  addInterceptors(client.device.os, streamInterceptor);
  const snapshot = createState<SnapshotInfo | null>(null);
  const nodesAtom = createState<Map<Id, ClientNode>>(new Map());
  const frameworkEvents = createDataSource<AugmentedFrameworkEvent>([], {
    indices: [['nodeId']],
    limit: 10000,
  });
  const frameworkEventsCustomColumns = createState<Set<string>>(new Set());

  const frameworkEventMetadata = createState<
    Map<FrameworkEventType, FrameworkEventMetadata>
  >(new Map());

  const uiState: UIState = createUIState();

  //this is the client data is what drives all of desktop UI
  //it is always up-to-date with the client regardless of whether we are paused or not
  const mutableLiveClientData: LiveClientState = {
    snapshotInfo: null,
    nodes: new Map(),
  };

  let lastProcessedFrameTime = 0;

  const _uiActions = uiActions(
    uiState,
    nodesAtom,
    snapshot,
    mutableLiveClientData,
    client,
  );

  const perfEvents = createDataSource<PerformanceStatsEvent, 'txId'>([], {
    key: 'txId',
    limit: 10 * 1024,
  });

  client.onMessage('init', (event) => {
    console.log('[ui-debugger] init');
    rootId.set(event.rootId);
    uiState.frameworkEventMonitoring.update((draft) => {
      event.frameworkEventMetadata?.forEach((frameworkEventMeta) => {
        draft.set(frameworkEventMeta.type, false);
      });
    });
    if (
      event.supportedTraversalModes &&
      event.supportedTraversalModes.length > 1
    ) {
      uiState.supportedTraversalModes.set(event.supportedTraversalModes);
    }
    if (
      event.currentTraversalMode &&
      uiState.supportedTraversalModes.get().includes(event.currentTraversalMode)
    ) {
      uiState.traversalMode.set(event.currentTraversalMode);
      console.log(
        `[ui-debugger] Unsupported debugger mode ${event.currentTraversalMode}.`,
      );
    }

    frameworkEventMetadata.update((draft) => {
      event.frameworkEventMetadata?.forEach((frameworkEventMeta) => {
        draft.set(frameworkEventMeta.type, frameworkEventMeta);
      });
    });
  });

  handleTraversalError(client);

  client.onConnect(() => {
    uiState.isConnected.set(true);
    console.log('[ui-debugger] connected');
  });

  client.onDisconnect(() => {
    uiState.isConnected.set(false);
    console.log('[ui-debugger] disconnected');
  });

  client.onMessage('metadataUpdate', async (event) => {
    if (!event.attributeMetadata) {
      return;
    }
    const metadata = Object.values(event.attributeMetadata);
    streamInterceptor.emit('metadataReceived', metadata);
  });

  streamInterceptor.on('metadataUpdated', (updatedMetadata) => {
    metadata.update((draft) => {
      for (const meta of updatedMetadata) {
        draft.set(meta.id, meta);
      }
    });
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

  const processFrame = async (frameScan: FrameScanEvent) => {
    const nodes = new Map(frameScan.nodes.map((node) => [node.id, {...node}]));

    streamInterceptor.emit('frameReceived', {
      frameTime: frameScan.frameTime,
      snapshot: frameScan.snapshot,
      nodes: nodes,
    });
    applyFrameworkEvents(frameScan, nodes);
  };

  streamInterceptor.on('frameUpdated', (frame) => {
    if (frame.frameTime > lastProcessedFrameTime) {
      applyFrameData(frame.nodes, frame.snapshot);
      lastProcessedFrameTime = frame.frameTime;
      const selectedNode = uiState.selectedNode.get();
      if (selectedNode != null)
        _uiActions.ensureAncestorsExpanded(selectedNode.id);
    }
  });

  function applyFrameworkEvents(
    frameScan: FrameScanEvent,
    nodes: Map<Id, ClientNode>,
  ) {
    const customColumns = frameworkEventsCustomColumns.get();
    for (const frameworkEvent of frameScan.frameworkEvents ?? []) {
      for (const key in frameworkEvent.payload) {
        customColumns.add(key);
      }

      const treeRoot = getNode(frameworkEvent.treeId, nodes);

      const treeRootFirstChild = getNode(first(treeRoot?.children), nodes);
      frameworkEvents.append({
        ...frameworkEvent,
        nodeName: nodes.get(frameworkEvent.nodeId)?.name,
        rootComponentName: treeRootFirstChild?.name,
      });
    }
    frameworkEventsCustomColumns.set(customColumns);

    if (uiState.isPaused.get() === true) {
      return;
    }

    const monitoredEvents = uiState.frameworkEventMonitoring.get();

    const filterMainThread = uiState.filterMainThreadMonitoring.get();

    const nodesToHighlight =
      frameScan.frameworkEvents
        ?.filter(
          (frameworkEvent) => monitoredEvents.get(frameworkEvent.type) === true,
        )
        .filter(
          (frameworkEvent) =>
            filterMainThread === false || frameworkEvent.thread === 'main',
        )
        .map((event) => event.nodeId) ?? [];

    uiState.highlightedNodes.update((draft) => {
      for (const node of nodesToHighlight) {
        draft.set(
          node,
          `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        );
      }
    });

    setTimeout(() => {
      uiState.highlightedNodes.update((draft) => {
        for (const nodeId of nodesToHighlight) {
          draft.delete(nodeId);
        }
      });
    }, HighlightTime);
  }

  function applyFrameData(
    nodes: Map<Id, ClientNode>,
    snapshotInfo: SnapshotInfo | undefined,
  ) {
    if (snapshotInfo) {
      mutableLiveClientData.snapshotInfo = snapshotInfo;
    }
    mutableLiveClientData.nodes = nodes;

    if (!uiState.isPaused.get()) {
      nodesAtom.set(mutableLiveClientData.nodes);
      snapshot.set(mutableLiveClientData.snapshotInfo);

      checkFocusedNodeStillActive(uiState, nodesAtom.get());
    }
    setTimeout(() => {
      //let react render, this can happen async
      for (const node of nodes.values()) {
        prefetchSourceFileLocation(node);
      }
    }, 0);
  }

  client.onMessage('subtreeUpdate', (subtreeUpdate) => {
    processFrame({
      frameTime: subtreeUpdate.txId,
      nodes: subtreeUpdate.nodes,
      snapshot: {data: subtreeUpdate.snapshot, nodeId: subtreeUpdate.rootId},
      frameworkEvents: subtreeUpdate.frameworkEvents,
    });
  });
  client.onMessage('frameScan', processFrame);

  return {
    rootId,
    uiState: uiState as ReadOnlyUIState,
    uiActions: _uiActions,
    nodes: nodesAtom,
    frameworkEvents,
    frameworkEventMetadata,
    frameworkEventsCustomColumns,
    snapshot,
    metadata,
    perfEvents,
    os: client.device.os,
  };
}

const HighlightTime = 1500;
export {Component} from './components/main';
export * from './ClientTypes';

function createUIState(): UIState {
  return {
    isConnected: createState(false),

    viewMode: createState({mode: 'default'}),

    //used to disabled hover effects which cause rerenders and mess up the existing context menu
    isContextMenuOpen: createState<boolean>(false),

    streamState: createState<StreamState>({state: 'Ok'}),
    visualiserWidth: createState(Math.min(window.innerWidth / 4.5, 500)),

    highlightedNodes: createState(new Map<Id, Color>()),

    selectedNode: createState<NodeSelection | undefined>(undefined),
    //used to indicate whether we will higher the visualizer / tree when a matching event comes in
    //also whether or not will show running total  in the tree
    frameworkEventMonitoring: createState(
      new Map<FrameworkEventType, boolean>(),
    ),
    filterMainThreadMonitoring: createState(false),

    isPaused: createState(false),

    //The reason for the array as that user could be hovering multiple overlapping nodes at once in the visualiser.
    //The nodes are sorted by area since you most likely want to select the smallest node under your cursor
    hoveredNodes: createState<Id[]>([]),

    searchTerm: createState<string>(''),
    focusedNode: createState<Id | undefined>(undefined),
    expandedNodes: createState<Set<Id>>(new Set()),
    wireFrameMode: createState<WireFrameMode>('All'),

    // view-hierarchy is the default state so we start with it until we fetch supported modes from the client
    supportedTraversalModes: createState<TraversalMode[]>(['view-hierarchy']),
    traversalMode: createState<TraversalMode>('view-hierarchy'),
  };
}
