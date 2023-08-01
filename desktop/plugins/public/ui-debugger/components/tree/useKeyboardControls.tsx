/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Id} from '../../ClientTypes';
import {OnSelectNode} from '../../DesktopTypes';
import {TreeNode} from './Tree';
import {Virtualizer} from '@tanstack/react-virtual';
import {usePlugin} from 'flipper-plugin';
import {plugin} from '../../index';
import {useEffect} from 'react';

export type MillisSinceEpoch = number;

export function useKeyboardControls(
  treeNodes: TreeNode[],
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>,
  selectedNodeId: Id | undefined,
  hoveredNodeId: Id | undefined,
  onSelectNode: OnSelectNode,
  onHoverNode: (...id: Id[]) => void,
  onExpandNode: (id: Id) => void,
  onCollapseNode: (id: Id) => void,
  isUsingKBToScrollUntill: React.MutableRefObject<number>,
) {
  const instance = usePlugin(plugin);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      const kbTargetNodeId = selectedNodeId ?? hoveredNodeId;
      const kbTargetNode = treeNodes.find((item) => item.id === kbTargetNodeId);

      switch (event.key) {
        case 'Enter': {
          if (hoveredNodeId != null) {
            onSelectNode(hoveredNodeId, 'keyboard');
          }

          break;
        }

        case 'ArrowRight':
          event.preventDefault();
          if (kbTargetNode) {
            if (kbTargetNode.isExpanded) {
              moveSelectedNodeUpOrDown(
                'ArrowDown',
                treeNodes,
                rowVirtualizer,
                kbTargetNode.id,
                selectedNodeId,
                onSelectNode,
                onHoverNode,
                isUsingKBToScrollUntill,
              );
            } else {
              onExpandNode(kbTargetNode.id);
            }
          }
          break;
        case 'ArrowLeft': {
          event.preventDefault();

          if (kbTargetNode) {
            if (kbTargetNode.isExpanded) {
              onCollapseNode(kbTargetNode.id);
            } else {
              const parentIdx = treeNodes.findIndex(
                (treeNode) => treeNode.id === kbTargetNode.parent,
              );
              moveSelectedNodeViaKeyBoard(
                parentIdx,
                treeNodes,
                rowVirtualizer,
                onSelectNode,
                onHoverNode,
                isUsingKBToScrollUntill,
              );
            }
          }
          break;
        }

        case 'ArrowUp':
        case 'ArrowDown':
          event.preventDefault();

          moveSelectedNodeUpOrDown(
            event.key,
            treeNodes,
            rowVirtualizer,
            hoveredNodeId,
            selectedNodeId,
            onSelectNode,
            onHoverNode,
            isUsingKBToScrollUntill,
          );

          break;
      }
    };
    window.addEventListener('keydown', listener);
    return () => {
      window.removeEventListener('keydown', listener);
    };
  }, [
    treeNodes,
    onSelectNode,
    selectedNodeId,
    isUsingKBToScrollUntill,
    onExpandNode,
    onCollapseNode,
    instance.uiState.hoveredNodes,
    hoveredNodeId,
    rowVirtualizer,
    onHoverNode,
  ]);
}

export type UpOrDown = 'ArrowDown' | 'ArrowUp';

function moveSelectedNodeUpOrDown(
  direction: UpOrDown,
  treeNodes: TreeNode[],
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>,
  hoveredNode: Id | undefined,
  selectedNode: Id | undefined,
  onSelectNode: OnSelectNode,
  onHoverNode: (...id: Id[]) => void,
  isUsingKBToScrollUntill: React.MutableRefObject<MillisSinceEpoch>,
) {
  const nodeToUse = selectedNode != null ? selectedNode : hoveredNode;
  const curIdx = treeNodes.findIndex((item) => item.id === nodeToUse);
  if (curIdx != -1) {
    const increment = direction === 'ArrowDown' ? 1 : -1;
    const newIdx = curIdx + increment;

    moveSelectedNodeViaKeyBoard(
      newIdx,
      treeNodes,
      rowVirtualizer,
      onSelectNode,
      onHoverNode,
      isUsingKBToScrollUntill,
    );
  }
}

function moveSelectedNodeViaKeyBoard(
  newIdx: number,
  treeNodes: TreeNode[],
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>,
  onSelectNode: OnSelectNode,
  onHoverNode: (...id: Id[]) => void,
  isUsingKBToScrollUntil: React.MutableRefObject<number>,
) {
  if (newIdx >= 0 && newIdx < treeNodes.length) {
    const newNode = treeNodes[newIdx];

    extendKBControlLease(isUsingKBToScrollUntil);
    onSelectNode(newNode.id, 'keyboard');
    onHoverNode(newNode.id);

    rowVirtualizer.scrollToIndex(newIdx, {align: 'auto'});
  }
}

const KBScrollOverrideTimeMS = 250;
function extendKBControlLease(
  isUsingKBToScrollUntil: React.MutableRefObject<number>,
) {
  /**
   * The reason for this grossness is that when scrolling to an element via keyboard, it will move a new dom node
   * under the cursor which will trigger the onmouseenter event for that node even if the mouse never actually was moved.
   * This will in turn cause that event handler to hover that node rather than the one the user is trying to get to via keyboard.
   * This is a dubious way to work around this. We set this to indicate how long into the future we should disable the
   *  onmouseenter -> hover behaviour
   */
  isUsingKBToScrollUntil.current =
    new Date().getTime() + KBScrollOverrideTimeMS;
}
