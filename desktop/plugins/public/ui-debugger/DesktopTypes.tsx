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
  Inspectable,
  Bounds,
  Tag,
  ClientNode,
  Metadata,
} from './ClientTypes';

export type UIState = {
  viewMode: Atom<ViewMode>;
  isConnected: Atom<boolean>;
  isPaused: Atom<boolean>;
  streamState: Atom<StreamState>;
  searchTerm: Atom<string>;
  isContextMenuOpen: Atom<boolean>;
  hoveredNodes: Atom<Id[]>;
  selectedNode: Atom<NodeSelection | undefined>;
  highlightedNodes: Atom<Set<Id>>;
  focusedNode: Atom<Id | undefined>;
  expandedNodes: Atom<Set<Id>>;
  visualiserWidth: Atom<number>;
  frameworkEventMonitoring: Atom<Map<FrameworkEventType, boolean>>;
  filterMainThreadMonitoring: Atom<boolean>;
};

//enumerates the keys of input type and casts each to ReadOnlyAtom, this is so we only expose read only atoms to the UI
//and all writes come through UIActions
type TransformToReadOnly<T> = {
  [P in keyof T]: T[P] extends Atom<infer U> ? _ReadOnlyAtom<U> : T[P];
};

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

export type ViewMode =
  | {mode: 'default'}
  | {mode: 'frameworkEventsTable'; treeRootId: Id};

export type NodeSelection = {
  id: Id;
  source: SelectionSource;
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
};

export type SelectionSource = 'visualiser' | 'tree' | 'keyboard';

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

export interface StreamInterceptor {
  transformNodes(
    nodes: Map<Id, ClientNode>,
  ): Promise<[Map<Id, ClientNode>, Metadata[]]>;

  transformMetadata(metadata: Metadata): Promise<Metadata>;
}

export class StreamInterceptorError extends Error {
  title: string;

  constructor(title: string, message: string) {
    super(message);
    this.title = title;
  }
}
