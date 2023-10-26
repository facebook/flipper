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
  selectedNode: Atom<NodeSelection | undefined>;
  highlightedNodes: Atom<Map<Id, Color>>;
  focusedNode: Atom<Id | undefined>;
  expandedNodes: Atom<Set<Id>>;
  visualiserWidth: Atom<number>;
  frameworkEventMonitoring: Atom<Map<FrameworkEventType, boolean>>;
  filterMainThreadMonitoring: Atom<boolean>;

  supportedTraversalModes: Atom<TraversalMode[]>;
  traversalMode: Atom<TraversalMode>;
};

//enumerates the keys of input type and casts each to ReadOnlyAtom, this is so we only expose read only atoms to the UI
//and all writes come through UIActions
type TransformToReadOnly<T> = {
  [P in keyof T]: T[P] extends Atom<infer U> ? _ReadOnlyAtom<U> : T[P];
};

export type WireFrameMode = 'All' | 'SelectedAndChildren' | 'SelectedOnly';

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
  | {mode: 'frameworkEventsTable'; nodeId: Id; isTree: boolean};

export type NodeSelection = {
  id: Id;
  source: SelectionSource;
};

export type AugmentedFrameworkEvent = FrameworkEvent & {
  nodeName?: string;
  rootComponentName?: string;
};

export type OnSelectNode = (
  node: Id | undefined,
  source: SelectionSource,
) => void;

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
