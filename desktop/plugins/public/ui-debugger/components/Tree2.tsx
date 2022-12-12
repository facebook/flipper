/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Id, UINode} from '../types';
import React, {useEffect, useState} from 'react';
import {
  HighlightManager,
  HighlightProvider,
  styled,
  theme,
  useHighlighter,
  usePlugin,
  useValue,
} from 'flipper-plugin';
import {plugin} from '../index';
import {Glyph} from 'flipper';
import {head} from 'lodash';

export function Tree2({
  nodes,
  rootId,
  selectedNode,
  onSelectNode,
}: {
  nodes: Map<Id, UINode>;
  rootId: Id;
  selectedNode?: Id;
  onSelectNode: (node?: Id) => void;
}) {
  const instance = usePlugin(plugin);
  const expandedNodes = useValue(instance.uiState.expandedNodes);
  const searchTerm = useValue(instance.uiState.searchTerm);

  const items = toTreeList(nodes, rootId, expandedNodes);

  return (
    <HighlightProvider
      text={searchTerm}
      highlightColor={theme.searchHighlightBackground.yellow}>
      <div
        onMouseLeave={() => {
          instance.uiState.hoveredNodes.set([]);
        }}>
        {items.map((treeNode) => (
          <TreeItemContainer
            key={treeNode.id}
            treeNode={treeNode}
            selectedNode={selectedNode}
            onSelectNode={onSelectNode}
          />
        ))}
      </div>
    </HighlightProvider>
  );
}

export type TreeNode = UINode & {
  depth: number;
  isExpanded: boolean;
};

function TreeItemContainer({
  treeNode,
  selectedNode,
  onSelectNode,
}: {
  treeNode: TreeNode;
  selectedNode?: Id;
  hoveredNode?: Id;
  onSelectNode: (node?: Id) => void;
}) {
  const instance = usePlugin(plugin);
  const isHovered = useIsHovered(treeNode.id);
  return (
    <TreeItem
      isSelected={treeNode.id === selectedNode}
      isHovered={isHovered}
      onMouseEnter={() => {
        instance.uiState.hoveredNodes.set([treeNode.id]);
      }}
      onClick={() => {
        onSelectNode(treeNode.id);
      }}
      item={treeNode}>
      <Arrow
        expanded={treeNode.isExpanded}
        onClick={() => {
          instance.uiState.expandedNodes.update((draft) => {
            if (draft.has(treeNode.id)) {
              draft.delete(treeNode.id);
            } else {
              draft.add(treeNode.id);
            }
          });
        }}
      />

      {nodeIcon(treeNode)}
      <HighlightedText text={treeNode.name} />
    </TreeItem>
  );
}

function useIsHovered(nodeId: Id) {
  const instance = usePlugin(plugin);
  const [isHovered, setIsHovered] = useState(false);
  useEffect(() => {
    const listener = (newValue?: Id[], prevValue?: Id[]) => {
      //only change state if the prev or next hover state affect us, this avoids rerendering the whole tree for a hover
      //change
      if (head(prevValue) === nodeId || head(newValue) === nodeId) {
        const hovered = head(newValue) === nodeId;
        setIsHovered(hovered);
      }
    };
    instance.uiState.hoveredNodes.subscribe(listener);
    return () => {
      instance.uiState.hoveredNodes.unsubscribe(listener);
    };
  }, [instance.uiState.hoveredNodes, nodeId]);

  return isHovered;
}

const TreeItem = styled.li<{
  item: TreeNode;
  isHovered: boolean;
  isSelected: boolean;
}>(({item, isHovered, isSelected}) => ({
  display: 'flex',
  alignItems: 'center',
  height: '26px',
  paddingLeft: `${(item.depth + 1) * renderDepthOffset}px`,
  borderWidth: '1px',
  borderRadius: '3px',
  borderColor: isHovered ? theme.selectionBackgroundColor : 'transparent',
  borderStyle: 'solid',
  backgroundColor: isSelected ? theme.selectionBackgroundColor : theme.white,
}));

function Arrow(props: {onClick: () => void; expanded: boolean}) {
  return (
    <div style={{display: 'flex'}} onClick={props.onClick}>
      <Glyph
        style={{
          transform: props.expanded ? 'rotate(90deg)' : '',
          marginRight: '4px',
          marginBottom: props.expanded ? '2px' : '',
        }}
        name="chevron-right"
        size={12}
        color="grey"
      />
    </div>
  );
}

function HighlightedText(props: {text: string}) {
  const highlightManager: HighlightManager = useHighlighter();
  return <span>{highlightManager.render(props.text)}</span>;
}

function nodeIcon(node: UINode) {
  if (node.tags.includes('Litho')) {
    return <DecorationImage src="icons/litho-logo.png" />;
  }
}

const DecorationImage = styled.img({
  height: 12,
  marginRight: 5,
  width: 12,
});

const renderDepthOffset = 4;

function toTreeList(
  nodes: Map<Id, UINode>,
  rootId: Id,
  expandedNodes: Set<Id>,
): TreeNode[] {
  const root = nodes.get(rootId);
  if (root == null) {
    return [];
  }
  const stack = [[root, 0]] as [UINode, number][];

  const res = [] as TreeNode[];

  while (stack.length > 0) {
    const [cur, depth] = stack.pop()!!;

    const isExpanded = expandedNodes.has(cur.id);
    res.push({
      ...cur,
      depth,
      isExpanded,
    });

    if (isExpanded) {
      for (const childId of cur.children) {
        const child = nodes.get(childId);
        if (child != null) {
          stack.push([child, depth + 1]);
        } else {
          console.log('null', childId);
        }
      }
    }
  }

  return res;
}
