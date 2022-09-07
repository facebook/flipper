/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {PluginClient, createState} from 'flipper-plugin';

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

export type Id = string;
export type UINode = {
  id: Id;
  name: string;
  attributes: Record<string, Inspectable>;
  children: Id[];
};

type Events = {
  init: {rootId: string};
  nativeScan: {nodes: UINode[]};
};

export function plugin(client: PluginClient<Events>) {
  const rootId = createState<Id | undefined>(undefined);

  const nodesAtom = createState<Map<Id, UINode>>(new Map());
  client.onMessage('init', (root) => rootId.set(root.rootId));

  client.onMessage('nativeScan', ({nodes}) => {
    nodesAtom.set(new Map(nodes.map((node) => [node.id, node])));
    console.log(nodesAtom.get());
  });

  return {rootId, nodes: nodesAtom};
}

export {Component} from './components/main';
