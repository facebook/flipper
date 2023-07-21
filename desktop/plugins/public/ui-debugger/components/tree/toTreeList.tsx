/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */
import {
  FrameworkEvent,
  FrameworkEventType,
  Id,
  ClientNode,
} from '../../ClientTypes';
import {DataSource} from 'flipper-plugin';
import {last} from 'lodash';
import {reverse} from 'lodash/fp';
import {TreeNode} from './Tree';

type TreeListStackItem = {
  node: ClientNode;
  depth: number;
  isChildOfSelectedNode: boolean;
  selectedNodeDepth: number;
};
export function toTreeList(
  nodes: Map<Id, ClientNode>,
  rootId: Id,
  expandedNodes: Set<Id>,
  selectedNode: Id | undefined,
  frameworkEvents: DataSource<FrameworkEvent>,
  frameworkEventsMonitoring: Map<FrameworkEventType, boolean>,
  filterMainThreadMonitoring: boolean,
): TreeNode[] {
  const root = nodes.get(rootId);
  if (root == null) {
    return [];
  }
  const stack = [
    {node: root, depth: 0, isChildOfSelectedNode: false, selectedNodeDepth: 0},
  ] as TreeListStackItem[];

  const treeNodes = [] as TreeNode[];

  let i = 0;
  while (stack.length > 0) {
    const stackItem = stack.pop()!!;

    const {node, depth} = stackItem;

    //if the previous item has an indent guide but we don't then it was the last segment
    //so we trim the bottom
    const prevItemLine = last(treeNodes)?.indentGuide;
    if (prevItemLine != null && stackItem.isChildOfSelectedNode === false) {
      prevItemLine.trimBottom = true;
    }

    const isExpanded = expandedNodes.has(node.id);
    const isSelected = node.id === selectedNode;

    let events = frameworkEvents.getAllRecordsByIndex({nodeId: node.id});
    if (events) {
      events = events
        .filter((e) => frameworkEventsMonitoring.get(e.type))
        .filter(
          (e) => filterMainThreadMonitoring === false || e.thread === 'main',
        );
    }

    treeNodes.push({
      ...node,
      idx: i,
      depth,
      isExpanded,
      frameworkEvents: events.length > 0 ? events.length : null,
      indentGuide: stackItem.isChildOfSelectedNode
        ? {
            depth: stackItem.selectedNodeDepth,
            style: 'ToChildren',
            //if first child of selected node add horizontal marker
            addHorizontalMarker: depth === stackItem.selectedNodeDepth + 1,
            trimBottom: false,
          }
        : null,
    });
    i++;

    let isChildOfSelectedNode = stackItem.isChildOfSelectedNode;
    let selectedNodeDepth = stackItem.selectedNodeDepth;
    if (isSelected) {
      isChildOfSelectedNode = true;
      selectedNodeDepth = depth;
      // walk back through tree nodes, while depth is greater or equal than current it is your
      // parents child / your previous cousin so set dashed line
      for (let i = treeNodes.length - 1; i >= 0; i--) {
        const prevNode = treeNodes[i];
        if (prevNode.depth < depth) {
          break;
        }
        prevNode.indentGuide = {
          depth: selectedNodeDepth - 1,
          style: 'ToParent',
          addHorizontalMarker: prevNode.depth == depth,
          trimBottom: prevNode.id === selectedNode,
        };
      }
    }

    if (isExpanded) {
      //since we do dfs and use a stack we have to reverse children to get the order correct
      for (const childId of reverse(node.children)) {
        const child = nodes.get(childId);
        if (child != null) {
          stack.push({
            node: child,
            depth: depth + 1,
            isChildOfSelectedNode: isChildOfSelectedNode,
            selectedNodeDepth: selectedNodeDepth,
          });
        }
      }
    }
  }

  //always trim last indent guide
  const prevItemLine = last(treeNodes)?.indentGuide;
  if (prevItemLine != null) {
    prevItemLine.trimBottom = true;
  }

  return treeNodes;
}
