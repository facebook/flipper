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
  useHighlighter,
  theme,
} from 'flipper-plugin';

import {head} from 'lodash';
import {Dropdown, Menu} from 'antd';
import {UIDebuggerMenuItem} from './util/UIDebuggerMenuItem';

export function Tree(props: {
  rootId: Id;
  nodes: Map<Id, UINode>;
  selectedNode?: Id;
  onSelectNode: (id: Id) => void;
}) {
  const instance = usePlugin(plugin);
  const expandedItems = useValue(instance.treeState).expandedNodes;
  const focused = useValue(instance.focusedNode);

  const items = useMemo(
    () => toComplexTree(focused || props.rootId, props.nodes),
    [focused, props.nodes, props.rootId],
  );
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
              if (!instance.isContextMenuOpen.get()) {
                instance.hoveredNodes.set([item.index]);
              }
            },
          }),
        }}>
        <ComplexTree
          treeId="tree"
          rootItem={FakeNode.id as any} //the typing in in the library is wrong here
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
      <ContextMenu node={item.data} id={item.index} title={item.data.name}>
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
      </ContextMenu>

      {children}
    </li>
  );
}

type ContextMenuProps = {node: UINode; id: Id; title: string};

const ContextMenu: React.FC<ContextMenuProps> = ({id, title, children}) => {
  const instance = usePlugin(plugin);
  const focusedNode = instance.focusedNode.get();

  return (
    <Dropdown
      onVisibleChange={(visible) => {
        instance.isContextMenuOpen.set(visible);
      }}
      overlay={() => (
        <Menu>
          {focusedNode !== head(instance.hoveredNodes.get()) && (
            <UIDebuggerMenuItem
              key="focus"
              text={`Focus ${title}`}
              onClick={() => {
                instance.focusedNode.set(id);
              }}
            />
          )}

          {focusedNode && (
            <UIDebuggerMenuItem
              key="remove-focus"
              text="Remove focus"
              onClick={() => {
                instance.focusedNode.set(undefined);
              }}
            />
          )}
        </Menu>
      )}
      trigger={['contextMenu']}>
      <div>{children}</div>
    </Dropdown>
  );
};

function HighlightedText(props: {text: string}) {
  const highlightManager: HighlightManager = useHighlighter();
  return <span>{highlightManager.render(props.text)}</span>;
}

const FakeNode: UINode = {
  id: 'Fakeroot',
  qualifiedName: 'Fakeroot',
  name: 'Fakeroot',
  children: [],
  attributes: {},
  bounds: {x: 0, y: 0, height: 0, width: 0},
  tags: [],
};

function toComplexTree(
  root: Id,
  nodes: Map<Id, UINode>,
): Record<Id, TreeItem<UINode>> {
  const res: Record<Id, TreeItem<UINode>> = {};
  for (const node of nodes.values()) {
    res[node.id] = {
      index: node.id,
      children: node.children,
      data: node,
      hasChildren: node.children.length > 0,
    };
  }

  //the library doesnt render the root node so we insert a fake one which will never be rendered
  //https://github.com/lukasbach/react-complex-tree/issues/42
  res[FakeNode.id] = {
    index: FakeNode.id,
    children: [root],
    hasChildren: true,
    data: FakeNode,
  };
  return res;
}
