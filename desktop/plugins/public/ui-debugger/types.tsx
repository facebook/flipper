/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

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
  activeChild?: Id;
};
