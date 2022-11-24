/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Id, UINode} from '../types';
import React, {useEffect, useMemo, useRef} from 'react';
import {
  Tree as ComplexTree,
  ControlledTreeEnvironment,
  TreeItem,
  TreeInformation,
  TreeItemRenderContext,
  InteractionMode,
  TreeEnvironmentRef,
} from 'react-complex-tree';

import {plugin} from '../index';
import {
  usePlugin,
  useValue,
  HighlightManager,
  HighlightProvider,
  HighlightContext,
  useHighlighter,
  theme,
} from 'flipper-plugin';

import {head} from 'lodash';

export function Tree(props: {
  rootId: Id;
  nodes: Map<Id, UINode>;
  selectedNode?: Id;
  onSelectNode: (id: Id) => void;
}) {
  const instance = usePlugin(plugin);
  const expandedItems = useValue(instance.treeState).expandedNodes;
  const items = useMemo(() => toComplexTree(props.nodes), [props.nodes]);
  const hoveredNodes = useValue(instance.hoveredNodes);
  const treeEnvRef = useRef<TreeEnvironmentRef>();

  const searchTerm = useValue(instance.searchTerm);

  useEffect(() => {
    //this makes the keyboard arrow  controls work always, even when using the visualiser
    treeEnvRef.current?.focusTree('tree', true);
  }, [props.selectedNode]);

  return (
    <HighlightProvider
      text={searchTerm}
      highlightColor={theme.searchHighlightBackground.yellow}>
      <ControlledTreeEnvironment
        ref={treeEnvRef as any}
        items={items}
        getItemTitle={(item) => item.data.name}
        canRename={false}
        canDragAndDrop={false}
        viewState={{
          tree: {
            focusedItem: head(hoveredNodes),
            expandedItems,
            selectedItems: props.selectedNode ? [props.selectedNode] : [],
          },
        }}
        onFocusItem={(item) => {
          instance.hoveredNodes.set([item.index]);
        }}
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
        renderItem={renderItem}
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
              instance.hoveredNodes.set([item.index]);
            },
          }),
        }}>
        <ComplexTree
          treeId="tree"
          rootItem={props.rootId as any} //the typing in in the library is wrong here
          treeLabel="UI"
        />
      </ControlledTreeEnvironment>
    </HighlightProvider>
  );
}

//copied from https://github.com/lukasbach/react-complex-tree/blob/e3dcc435933284376a0fc6e3cc651e67ead678b5/packages/core/src/renderers/createDefaultRenderers.tsx
const cx = (...classNames: Array<string | undefined | false>) =>
  classNames.filter((cn) => !!cn).join(' ');
const renderDepthOffset = 5;

function renderItem<C extends string = never>({
  item,
  depth,
  children,
  arrow,
  context,
}: {
  item: TreeItem<UINode>;
  depth: number;
  children: React.ReactNode | null;
  title: React.ReactNode;
  arrow: React.ReactNode;
  context: TreeItemRenderContext<C>;
  info: TreeInformation;
}) {
  return (
    <li
      {...(context.itemContainerWithChildrenProps as any)}
      className={cx(
        'rct-tree-item-li',
        item.hasChildren && 'rct-tree-item-li-hasChildren',
        context.isSelected && 'rct-tree-item-li-selected',
        context.isExpanded && 'rct-tree-item-li-expanded',
        context.isFocused && 'rct-tree-item-li-focused',
        context.isDraggingOver && 'rct-tree-item-li-dragging-over',
        context.isSearchMatching && 'rct-tree-item-li-search-match',
      )}>
      <div
        {...(context.itemContainerWithoutChildrenProps as any)}
        style={{
          paddingLeft: `${(depth + 1) * renderDepthOffset}px`,
        }}
        className={cx(
          'rct-tree-item-title-container',
          item.hasChildren && 'rct-tree-item-title-container-hasChildren',
          context.isSelected && 'rct-tree-item-title-container-selected',
          context.isExpanded && 'rct-tree-item-title-container-expanded',
          context.isFocused && 'rct-tree-item-title-container-focused',
          context.isDraggingOver &&
            'rct-tree-item-title-container-dragging-over',
          context.isSearchMatching &&
            'rct-tree-item-title-container-search-match',
        )}>
        {arrow}
        <div
          {...(context.interactiveElementProps as any)}
          className={cx(
            'rct-tree-item-button',
            item.hasChildren && 'rct-tree-item-button-hasChildren',
            context.isSelected && 'rct-tree-item-button-selected',
            context.isExpanded && 'rct-tree-item-button-expanded',
            context.isFocused && 'rct-tree-item-button-focused',
            context.isDraggingOver && 'rct-tree-item-button-dragging-over',
            context.isSearchMatching && 'rct-tree-item-button-search-match',
          )}>
          <HighlightedText text={item.data.name} />
        </div>
      </div>
      {children}
    </li>
  );
}

function HighlightedText(props: {text: string}) {
  const highlightManager: HighlightManager = useHighlighter();
  return <span>{highlightManager.render(props.text)}</span>;
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
