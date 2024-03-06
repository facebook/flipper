/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Atom, _ReadOnlyAtom} from 'flipper-plugin';
import {
  Id,
  FrameworkEventType,
  FrameworkEvent,
  Inspectable,
  Bounds,
  Tag,
  ClientNode,
  Metadata,
  SnapshotInfo,
  MetadataId,
  CompoundTypeHint,
} from './ClientTypes';
import TypedEmitter from 'typed-emitter';

export type LiveClientState = {
  snapshotInfo: SnapshotInfo | null;
  nodes: Map<Id, ClientNode>;
};

export type MetadataMap = Map<MetadataId, Metadata>;
export type Color = string;

export type UIState = {
  viewMode: Atom<ViewMode>;
  wireFrameMode: Atom<WireFrameMode>;
  isConnected: Atom<boolean>;
  isPaused: Atom<boolean>;
  streamState: Atom<StreamState>;
  searchTerm: Atom<string>;
  isContextMenuOpen: Atom<boolean>;
  hoveredNodes: Atom<Id[]>;
  nodeSelection: Atom<NodeSelection | undefined>;
  highlightedNodes: Atom<Map<Id, Color>>;
  focusedNode: Atom<Id | undefined>;
  expandedNodes: Atom<Set<Id>>;
  visualiserWidth: Atom<number>;
  nodeLevelFrameworkEventFilters: Atom<NodeLevelFrameworkEventFilters>;
  frameworkEventMonitoring: Atom<Map<FrameworkEventType, boolean>>;
  filterMainThreadMonitoring: Atom<boolean>;
  referenceImage: Atom<ReferenceImageState | null>;
  supportedTraversalModes: Atom<TraversalMode[]>;
  traversalMode: Atom<TraversalMode>;
};

type NodeLevelFrameworkEventFilters = {
  threads: Set<string>;
  eventTypes: Set<string>;
};

export type ReferenceImageState = {
  url: string;
  opacity: number;
};

//enumerates the keys of input type and casts each to ReadOnlyAtom, this is so we only expose read only atoms to the UI
//and all writes come through UIActions
type TransformToReadOnly<T> = {
  [P in keyof T]: T[P] extends Atom<infer U> ? _ReadOnlyAtom<U> : T[P];
};

export type WireFrameMode = 'All' | 'SelectedAndChildren' | 'SelectedOnly';
export type ReferenceImageAction = 'Import' | 'Clear' | number; //number is a change opacity

export type ReadOnlyUIState = TransformToReadOnly<UIState>;

export type StreamFlowState = {paused: boolean};

export type NestedNode = {
  id: Id;
  name: string;
  attributes: Record<string, Inspectable>;
  children: NestedNode[];
  bounds: Bounds;
  tags: Tag[];
  activeChildIdx?: number;
};

export type TraversalMode = 'view-hierarchy' | 'accessibility-hierarchy';

export type ViewMode =
  | {mode: 'default'}
  | {mode: 'frameworkEventsTable'; nodeId: Id | null; isTree: boolean | null};

export type NodeSelection = {
  /** This node may be stale, look up from node map via id to check if it is still in frame*/
  node: ClientNode;
  source: SelectionSource;
};

export type AugmentedFrameworkEvent = FrameworkEvent & {
  nodeName?: string;
  rootComponentName?: string;
};

export type OnSelectNode = (
  node: ClientNode | undefined,
  source: SelectionSource,
) => void;

export type Operation = 'add' | 'remove';

export type UIActions = {
  onHoverNode: (...node: Id[]) => void;
  onFocusNode: (focused?: Id) => void;
  onContextMenuOpen: (open: boolean) => void;
  onSelectNode: OnSelectNode;
  onExpandNode: (node: Id) => void;
  onCollapseNode: (node: Id) => void;
  setVisualiserWidth: (width: number) => void;
  onSetFilterMainThreadMonitoring: (toggled: boolean) => void;
  onSetViewMode: (viewMode: ViewMode) => void;
  onSetFrameworkEventMonitored: (
    eventType: FrameworkEventType,
    monitored: boolean,
  ) => void;
  onPlayPauseToggled: () => void;
  onSearchTermUpdated: (searchTerm: string) => void;
  onSetWireFrameMode: (WireFrameMode: WireFrameMode) => void;
  onExpandAllRecursively: (nodeId: Id) => void;
  onCollapseAllNonAncestors: (nodeId: Id) => void;
  onCollapseAllRecursively: (nodeId: Id) => void;
  ensureAncestorsExpanded: (nodeId: Id) => void;
  onSetTraversalMode: (mode: TraversalMode) => void;
  onReferenceImageAction: (action: ReferenceImageAction) => Promise<void>;
  onChangeNodeLevelThreadFilter: (thread: string, op: Operation) => void;
  onChangeNodeLevelEventTypeFilter: (eventType: string, op: Operation) => void;
  editClientAttribute: (
    nodeId: Id,
    value: any,
    metadataIdPath: MetadataId[],
    compoundTypeHint?: CompoundTypeHint,
  ) => Promise<boolean>;
};

export type SelectionSource =
  | 'visualiser'
  | 'tree'
  | 'keyboard'
  | 'context-menu';

export type StreamState =
  | {state: 'Ok'}
  | {state: 'RetryingAfterError'}
  | {
      state: 'StreamInterceptorRetryableError';
      error: StreamInterceptorError;
      retryCallback: () => Promise<void>;
    }
  | {
      state: 'FatalError';
      error: Error;
      clearCallBack: () => Promise<void>;
    };

export type DesktopFrame = {
  nodes: Map<Id, ClientNode>;
  snapshot?: SnapshotInfo;
  frameTime: number;
};

export type StreamInterceptorEventEmitter = TypedEmitter<{
  /* one of these event will be emitted when frame comes from client */
  frameReceived: (frame: DesktopFrame) => void;
  /* at leat one these events will be emitted in reponse to frame received from client */
  frameUpdated: (frame: DesktopFrame) => void;
  /* one of these events will be emitted when metadata comes from client */
  metadataReceived: (metadata: Metadata[]) => void;
  /* at leat one these events will be emitted in reponse to frame received from client */
  metadataUpdated: (metadata: Metadata[]) => void;
}>;

export class StreamInterceptorError extends Error {
  title: string;

  constructor(title: string, message: string) {
    super(message);
    this.title = title;
  }
}
