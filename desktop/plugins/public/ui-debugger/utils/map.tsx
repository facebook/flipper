/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {ClientNode, Id} from '../ClientTypes';

export function getNode(
  id: Id | undefined,
  nodes: Map<Id, ClientNode>,
): ClientNode | undefined {
  //map just returns undefined when you pass null or undefined as a key
  return nodes.get(id!);
}
