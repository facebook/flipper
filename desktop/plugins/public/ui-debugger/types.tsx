/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export type StreamState =
  | {state: 'Ok'}
  | {state: 'RetryingAfterError'}
  | {
      state: 'StreamInterceptorRetryableError';
      error: StreamInterceptorError;
      retryCallback: () => Promise<void>;
    }
  | {
      state: 'UnrecoverableError';
    };

export type Events = {
  init: InitEvent;
  subtreeUpdate: SubtreeUpdateEvent;
  frameScan: FrameScanEvent;
  perfStats: PerfStatsEvent;
  performanceStats: PerformanceStatsEvent;
  metadataUpdate: UpdateMetadataEvent;
};

export type StreamFlowState = {paused: boolean};

export type FrameScanEvent = {
  frameTime: number;
  nodes: UINode[];
  snapshot?: SnapshotInfo;
  frameworkEvents?: FrameworkEvent[];
};

/**
 * @deprecated This  event should not be used and soon will
 * be removed. FrameScan should be used instead.
 */
export type SubtreeUpdateEvent = {
  txId: number;
  rootId: Id;
  nodes: UINode[];
  snapshot: Snapshot;
  frameworkEvents?: FrameworkEvent[];
};

export type FrameworkEventType = string;

export type FrameworkEventMetadata = {
  type: FrameworkEventType;
  documentation: string;
};

type JsonObject = {
  [key: string]: JSON;
};

type JSON = string | number | boolean | null | JSON[] | JsonObject;

type Stacktrace = {type: 'stacktrace'; stacktrace: string[]};
type Reason = {type: 'reason'; reason: string};
type UpstreamEvent = {type: 'upstreamEvent'; eventId: Id};
type FrameworkEventAttribution = Stacktrace | Reason | UpstreamEvent;

export type FrameworkEvent = {
  nodeId: Id;
  type: FrameworkEventType;
  timestamp: number;
  payload?: JSON;
  attribution?: FrameworkEventAttribution;
};

export type InitEvent = {
  rootId: Id;
  frameworkEventMetadata?: FrameworkEventMetadata[];
};

/**
 * @deprecated This performance event should not be used and soon will
 * be removed. PerformanceStatsEvent should be used instead.
 */
export type PerfStatsEvent = {
  txId: number;
  observerType: string;
  start: number;
  traversalComplete: number;
  snapshotComplete: number;
  queuingComplete: number;
  deferredComputationComplete: number;
  serializationComplete: number;
  socketComplete: number;
  nodesCount: number;
};

export type PerformanceStatsEvent = {
  txId: number;
  observerType: string;
  nodesCount: number;
  start: number;
  traversalMS: number;
  snapshotMS: number;
  queuingMS: number;
  deferredComputationMS: number;
  serializationMS: number;
  socketMS: number;
  payloadSize?: number;
};

export type UpdateMetadataEvent = {
  attributeMetadata: Record<MetadataId, Metadata>;
};

export type NestedNode = {
  id: Id;
  name: string;
  attributes: Record<string, Inspectable>;
  children: NestedNode[];
  bounds: Bounds;
  tags: Tag[];
  activeChildIdx?: number;
};

export type UINode = {
  id: Id;
  parent?: Id;
  qualifiedName: string; //this is the name of the component plus qualification so myles has a chance of finding it. E.g com.facebook.MyView
  lineNumber?: number;
  name: string;
  attributes: Record<MetadataId, Inspectable>;
  inlineAttributes: Record<string, string>;
  hiddenAttributes?: any;
  children: Id[];
  bounds: Bounds;
  tags: Tag[];
  activeChild?: Id;
};

export type Metadata = {
  id: MetadataId;
  type: string;
  namespace: string;
  name: string;
  mutable: boolean;
  customAttributes?: Record<string, string | number>;
};

export type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Size = {
  width: number;
  height: number;
};

export type SpaceBox = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type Coordinate = {
  x: number;
  y: number;
};

export type Coordinate3D = {
  x: number;
  y: number;
  z: number;
};

export type Color = {
  r: number;
  g: number;
  b: number;
  a: number;
};

export type Snapshot = string;
export type SnapshotInfo = {nodeId: Id; data: Snapshot};
export type Id = number | string;

export type MetadataId = number;
export type TreeState = {expandedNodes: Id[]};

export type Tag =
  | 'Native'
  | 'Declarative'
  | 'Android'
  | 'Litho'
  | 'CK'
  | 'iOS'
  | 'BloksBoundTree'
  | 'BloksDerived';

export type Inspectable =
  | InspectableObject
  | InspectableArray
  | InspectableText
  | InspectableNumber
  | InspectableColor
  | InspectableBoolean
  | InspectableEnum
  | InspectableCoordinate
  | InspectableCoordinate3D
  | InspectableSize
  | InspectableBounds
  | InspectableSpaceBox
  | InspectableUnknown;

export type InspectableText = {
  type: 'text';
  value: string;
};

export type InspectableNumber = {
  type: 'number';
  value: number;
};

export type InspectableBoolean = {
  type: 'boolean';
  value: boolean;
};

export type InspectableEnum = {
  type: 'enum';
  value: string;
};

export type InspectableColor = {
  type: 'color';
  value: Color;
};

export type InspectableBounds = {
  type: 'bounds';
  value: Bounds;
};

export type InspectableSize = {
  type: 'size';
  value: Size;
};

export type InspectableCoordinate = {
  type: 'coordinate';
  value: Coordinate;
};

export type InspectableCoordinate3D = {
  type: 'coordinate3d';
  value: Coordinate3D;
};

export type InspectableSpaceBox = {
  type: 'space';
  value: SpaceBox;
};

export type InspectableObject = {
  type: 'object';
  fields: Record<MetadataId, Inspectable>;
};

export type InspectableArray = {
  type: 'array';
  items: Inspectable[];
};

export type InspectableUnknown = {
  type: 'unknown';
  value: string;
};

export interface StreamInterceptor {
  transformNodes(
    nodes: Map<Id, UINode>,
  ): Promise<[Map<Id, UINode>, Metadata[]]>;

  transformMetadata(metadata: Metadata): Promise<Metadata>;
}

export class StreamInterceptorError extends Error {
  title: string;

  constructor(title: string, message: string) {
    super(message);
    this.title = title;
  }
}
