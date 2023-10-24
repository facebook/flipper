/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {TraversalMode} from './DesktopTypes';

export type Events = {
  init: InitEvent;
  subtreeUpdate: SubtreeUpdateEvent;
  frameScan: FrameScanEvent;
  traversalError: TraversalErrorEvent;
  perfStats: PerfStatsEvent;
  performanceStats: PerformanceStatsEvent;
  metadataUpdate: UpdateMetadataEvent;
  setTraversalMode: SetTraversalModeEvent;
};

export type Methods = {
  onTraversalModeChange(params: {mode: TraversalMode}): Promise<void>;
};

export type SetTraversalModeEvent = {
  mode: TraversalMode;
};

export type FrameScanEvent = {
  frameTime: number;
  nodes: ClientNode[];
  snapshot?: SnapshotInfo;
  frameworkEvents?: FrameworkEvent[];
};

export type TraversalErrorEvent = {
  nodeName: String;
  errorType: String;
  errorMessage: String;
  stack: String;
};

/**
 * @deprecated This  event should not be used and soon will
 * be removed. FrameScan should be used instead.
 */
export type SubtreeUpdateEvent = {
  txId: number;
  rootId: Id;
  nodes: ClientNode[];
  snapshot: Snapshot;
  frameworkEvents?: FrameworkEvent[];
};

export type NodeMap = Map<Id, ClientNode>;
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
  id: number;
  treeId?: Id; //todo should be mandatory once ios implements this
  nodeId: Id;
  type: FrameworkEventType;
  timestamp: number;
  payload?: JsonObject;
  duration?: number;
  attribution?: FrameworkEventAttribution;
  thread?: 'main' | string; //todo should be mandatory once ios implements this
};

export type InitEvent = {
  rootId: Id;
  frameworkEventMetadata?: FrameworkEventMetadata[];
  supportedTraversalModes?: TraversalMode[];
  currentTraversalMode?: TraversalMode;
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

export type DynamicPerformanceStatsEvent = PerformanceStatsEvent & {
  [key: string]: any;
};

export type UpdateMetadataEvent = {
  attributeMetadata: Record<MetadataId, Metadata>;
};

export type UpdateAvailableTraversalModeEvent = {
  modes: TraversalMode[];
};

export type ClientNode = {
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

export type Tag =
  | 'Native'
  | 'Declarative'
  | 'Android'
  | 'Litho'
  | 'LithoMountable'
  | 'CK'
  | 'iOS'
  | 'BloksBoundTree'
  | 'BloksDerived'
  | 'TreeRoot'
  | 'Warning';

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
