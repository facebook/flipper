/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export type Events = {
  init: InitEvent;
  subtreeUpdate: SubtreeUpdateEvent;
  coordinateUpdate: CoordinateUpdateEvent;
  perfStats: PerfStatsEvent;
  performanceStats: PerformanceStatsEvent;
  metadataUpdate: UpdateMetadataEvent;
};

export type CoordinateUpdateEvent = {
  observerType: String;
  nodeId: Id;
  coordinate: Coordinate;
};

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

export type FrameworkEvent = {
  nodeId: Id;
  type: FrameworkEventType;
  timestamp: number;
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
  parent?: Id; //this attribute doesn't come from the client and is set by the desktop
  qualifiedName: string;
  name: string;
  attributes: Record<MetadataId, Inspectable>;
  inlineAttributes: Record<string, string>;
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
  tags?: string[];
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
export type Id = number;

export type MetadataId = number;
export type TreeState = {expandedNodes: Id[]};

export type Tag = 'Native' | 'Declarative' | 'Android' | 'Litho' | 'CK' | 'iOS';

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
