/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Draft} from 'flipper-plugin';
import {ClientNode, Id} from '../ClientTypes';
import {UIState} from '../DesktopTypes';

export function collapseinActiveChildren(
  node: ClientNode,
  expandedNodes: Draft<Set<Id>>,
) {
  if (node.activeChild) {
    expandedNodes.add(node.activeChild);
    for (const child of node.children) {
      if (child !== node.activeChild) {
        expandedNodes.delete(child);
      }
    }
  }
}

export function checkFocusedNodeStillActive(
  uiState: UIState,
  nodes: Map<Id, ClientNode>,
) {
  const focusedNodeId = uiState.focusedNode.get();
  const focusedNode = focusedNodeId != null && nodes.get(focusedNodeId);
  if (!focusedNode || !isFocusedNodeAncestryAllActive(focusedNode, nodes)) {
    uiState.focusedNode.set(undefined);
  }
}

function isFocusedNodeAncestryAllActive(
  focused: ClientNode,
  nodes: Map<Id, ClientNode>,
): boolean {
  let node = focused;

  while (node != null) {
    if (node.parent == null) {
      return true;
    }

    const parent = nodes.get(node.parent);

    if (parent == null) {
      //should also never happen
      return false;
    }

    if (parent.activeChild != null && parent.activeChild !== node.id) {
      return false;
    }

    node = parent;
  }
  //wont happen
  return false;
}
