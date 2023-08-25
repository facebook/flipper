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
} from './ClientTypes';
import {
  UIState,
  NodeSelection,
  StreamInterceptorError,
  StreamState,
  ReadOnlyUIState,
  LiveClientState,
  WireFrameMode,
  AugmentedFrameworkEvent,
} from './DesktopTypes';
import {getStreamInterceptor} from './fb-stubs/StreamInterceptor';
import {prefetchSourceFileLocation} from './components/fb-stubs/IDEContextMenu';
import {checkFocusedNodeStillActive} from './plugin/ClientDataUtils';
import {uiActions} from './plugin/uiActions';
import {first} from 'lodash';
import {getNode} from './utils/map';

type PendingData = {
  metadata: Record<MetadataId, Metadata>;
  frame: FrameScanEvent | null;
};

export function plugin(client: PluginClient<Events>) {
  const rootId = createState<Id | undefined>(undefined);
  const metadata = createState<Map<MetadataId, Metadata>>(new Map());
  const streamInterceptor = getStreamInterceptor(client.device.os);
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

  const perfEvents = createDataSource<PerformanceStatsEvent, 'txId'>([], {
    key: 'txId',
    limit: 10 * 1024,
  });

  //this holds pending any pending data that needs to be applied in the event of a stream interceptor error
  //while in the error state more metadata or a more recent frame may come in so both cases need to apply the same darta
  const pendingData: PendingData = {frame: null, metadata: {}};

  let lastFrameTime = 0;

  client.onMessage('init', (event) => {
    console.log('[ui-debugger] init');
    rootId.set(event.rootId);
    uiState.frameworkEventMonitoring.update((draft) => {
      event.frameworkEventMetadata?.forEach((frameworkEventMeta) => {
        draft.set(frameworkEventMeta.type, false);
      });
    });
    frameworkEventMetadata.update((draft) => {
      event.frameworkEventMetadata?.forEach((frameworkEventMeta) => {
        draft.set(frameworkEventMeta.type, frameworkEventMeta);
      });
    });
  });

  client.onConnect(() => {
    uiState.isConnected.set(true);
    console.log('[ui-debugger] connected');
  });

  client.onDisconnect(() => {
    uiState.isConnected.set(false);
    console.log('[ui-debugger] disconnected');
  });

  async function processMetadata(
    incomingMetadata: Record<MetadataId, Metadata>,
  ) {
    try {
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
      return true;
    } catch (error) {
      for (const metadata of Object.values(incomingMetadata)) {
        pendingData.metadata[metadata.id] = metadata;
      }
      handleStreamError('Metadata', error);
      return false;
    }
  }

  function handleStreamError(source: 'Frame' | 'Metadata', error: any) {
    if (error instanceof StreamInterceptorError) {
      const retryCallback = async () => {
        uiState.streamState.set({state: 'RetryingAfterError'});

        if (!(await processMetadata(pendingData.metadata))) {
          //back into error state, dont proceed
          return;
        }
        if (pendingData.frame != null) {
          if (!(await processFrame(pendingData.frame))) {
            //back into error state, dont proceed
            return;
          }
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

      uiState.streamState.set({
        state: 'FatalError',
        error: error,
        clearCallBack: async () => {
          uiState.streamState.set({state: 'Ok'});
          nodesAtom.set(new Map());
          frameworkEvents.clear();
          snapshot.set(null);
        },
      });
    }
  }

  client.onMessage('metadataUpdate', async (event) => {
    if (!event.attributeMetadata) {
      return;
    }

    await processMetadata(event.attributeMetadata);
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
    try {
      const nodes = new Map(
        frameScan.nodes.map((node) => [node.id, {...node}]),
      );
      if (frameScan.frameTime > lastFrameTime) {
        applyFrameData(nodes, frameScan.snapshot);
        lastFrameTime = frameScan.frameTime;
      }
      applyFrameworkEvents(frameScan, nodes);
      lastFrameTime = frameScan.frameTime;

      const [processedNodes, additionalMetadata] =
        await streamInterceptor.transformNodes(nodes);

      metadata.update((draft) => {
        for (const metadata of additionalMetadata) {
          draft.set(metadata.id, metadata);
        }
      });

      if (frameScan.frameTime >= lastFrameTime) {
        applyFrameData(processedNodes, frameScan.snapshot);
        lastFrameTime = frameScan.frameTime;
      }
    } catch (error) {
      pendingData.frame = frameScan;
      handleStreamError('Frame', error);
      return false;
    }
  };

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
        draft.add(node);
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

  //todo deal with racecondition, where bloks screen is fetching, takes time then you go back get more recent frame then bloks screen comes and overrites it
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
    uiActions: uiActions(uiState, nodesAtom, snapshot, mutableLiveClientData),
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

const HighlightTime = 300;

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

    highlightedNodes: createState(new Set<Id>()),

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
  };
}
