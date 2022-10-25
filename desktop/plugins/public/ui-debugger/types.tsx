/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {TreeItemIndex} from 'react-complex-tree';

export type Events = {
  init: InitEvent;
  subtreeUpdate: SubtreeUpdateEvent;
  coordinateUpdate: CoordinateUpdateEvent;
  perfStats: PerfStatsEvent;
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
};

export type InitEvent = {rootId: Id};

export type PerfStatsEvent = {
  txId: number;
  observerType: string;
  start: number;
  traversalComplete: number;
  snapshotComplete: number;
  serializationComplete: number;
  queuingComplete: number;
  socketComplete: number;
  nodesCount: number;
};

export type UINode = {
  id: Id;
  name: string;
  attributes: Record<string, Inspectable>;
  children: Id[];
  bounds: Bounds;
  tags: Tag[];
  activeChild?: Id;
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
  alpha: number;
};

export type Snapshot = string;
export type Id = number | TreeItemIndex;

export type TreeState = {expandedNodes: Id[]};

export type Tag = 'Native' | 'Declarative' | 'Android' | 'Litho ';

export type Inspectable =
  | InspectableObject
  | InspectableText
  | InspectableNumber
  | InspectableColor
  | InspectableBoolean
  | InspectableEnum
  | InspectableCoordinate
  | InspectableCoordinate3D
  | InspectableSize
  | InspectableBounds
  | InspectableSpaceBox;

export type InspectableText = {
  type: 'text';
  value: string;
  mutable: boolean;
};

export type InspectableNumber = {
  type: 'number';
  value: number;
  mutable: boolean;
};

export type InspectableBoolean = {
  type: 'boolean';
  value: boolean;
  mutable: boolean;
};

export type InspectableEnum = {
  type: 'enum';
  value: {value: string; values: string[]};
  mutable: boolean;
};

export type InspectableColor = {
  type: 'color';
  value: Color;
  mutable: boolean;
};

export type InspectableBounds = {
  type: 'bounds';
  value: Bounds;
  mutable: boolean;
};

export type InspectableSize = {
  type: 'size';
  value: Size;
  mutable: boolean;
};

export type InspectableCoordinate = {
  type: 'coordinate';
  value: Coordinate;
  mutable: boolean;
};

export type InspectableCoordinate3D = {
  type: 'coordinate3d';
  value: Coordinate3D;
  mutable: boolean;
};

export type InspectableSpaceBox = {
  type: 'space';
  value: SpaceBox;
  mutable: boolean;
};

export type InspectableObject = {
  type: 'object';
  fields: Record<string, Inspectable>;
};
