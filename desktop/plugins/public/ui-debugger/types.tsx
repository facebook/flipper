/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export type Events = {
  init: {rootId: string};
  nativeScan: {txId: number; nodes: UINode[]};
  subtreeUpdate: {txId: number; nodes: UINode[]};
  perfStats: PerfStatsEvent;
};

export type PerfStatsEvent = {
  txId: number;
  observerType: string;
  start: number;
  traversalComplete: number;
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
  bounds?: Bounds;
  tags: Tag[];
  activeChild?: Id;
};

export type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Id = string;

export type Tag = 'Native' | 'Declarative' | 'Android' | 'Litho ';

export type Inspectable =
  | InspectableObject
  | InspectableText
  | InspectableNumber
  | InspectableColor;

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

export type InspectableColor = {
  type: 'number';
  value: number;
  mutable: boolean;
};

export type InspectableObject = {
  type: 'object';
  fields: Record<string, Inspectable>;
};
