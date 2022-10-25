/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Id, UINode} from '../types';
import React, {useEffect, useRef} from 'react';
import {
  Tree as ComplexTree,
  ControlledTreeEnvironment,
  TreeItem,
} from 'react-complex-tree';

import {plugin} from '../index';
import {usePlugin, useValue} from 'flipper-plugin';
import {
  InteractionMode,
  TreeEnvironmentRef,
} from 'react-complex-tree/lib/esm/types';

export function Tree(props: {
  rootId: Id;
  nodes: Map<Id, UINode>;
  selectedNode?: Id;
  hoveredNode?: Id;
  onSelectNode: (id: Id) => void;
  onHoveredNode: (id?: Id) => void;
}) {
  const instance = usePlugin(plugin);
  const expandedItems = useValue(instance.treeState).expandedNodes;
  const items = toComplexTree(props.nodes);

  const treeRef = useRef<TreeEnvironmentRef>();
  useEffect(() => {
    //this makes the keyboard arrow  controls work always, even when using the visualiser
    treeRef.current?.focusTree('tree', true);
  }, [props.hoveredNode, props.selectedNode]);
  return (
    <ControlledTreeEnvironment
      ref={treeRef as any}
      items={items}
      getItemTitle={(item) => item.data.name}
      canRename={false}
      canDragAndDrop={false}
      canSearch
      autoFocus
      viewState={{
        tree: {
          focusedItem: props.hoveredNode,
          expandedItems,
          selectedItems: props.selectedNode ? [props.selectedNode] : [],
        },
      }}
      onFocusItem={(item) => props.onHoveredNode(item.index)}
      onExpandItem={(item) => {
        instance.treeState.update((draft) => {
          draft.expandedNodes.push(item.index);
        });
      }}
      onCollapseItem={(item) =>
        instance.treeState.update((draft) => {
          draft.expandedNodes = draft.expandedNodes.filter(
            (expandedItemIndex) => expandedItemIndex !== item.index,
          );
        })
      }
      onSelectItems={(items) => props.onSelectNode(items[0])}
      defaultInteractionMode={{
        mode: 'custom',
        extends: InteractionMode.DoubleClickItemToExpand,
        createInteractiveElementProps: (
          item,
          treeId,
          actions,
          renderFlags,
        ) => ({
          onClick: () => {
            if (renderFlags.isSelected) {
              actions.unselectItem();
            } else {
              actions.selectItem();
            }
          },
          onMouseOver: () => {
            props.onHoveredNode(item.index);
          },
        }),
      }}>
      <ComplexTree
        treeId="tree"
        rootItem={props.rootId as any} //the typing in in the library is wrong here
        treeLabel="UI"
      />
    </ControlledTreeEnvironment>
  );
}

function toComplexTree(nodes: Map<Id, UINode>): Record<Id, TreeItem<UINode>> {
  const res: Record<Id, TreeItem<UINode>> = {};
  for (const node of nodes.values()) {
    res[node.id] = {
      index: node.id,
      canMove: false,
      canRename: false,
      children: node.children,
      data: node,
      hasChildren: node.children.length > 0,
    };
  }
  return res;
}
