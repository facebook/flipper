/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */
import {Id, UINode} from '../types';
import React from 'react';
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
      <div>
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
};

function TreeItemContainer({
  treeNode,
  selectedNode,
  hoveredNode,
  onSelectNode,
}: {
  treeNode: TreeNode;
  selectedNode?: Id;
  hoveredNode?: Id;
  onSelectNode: (node?: Id) => void;
}) {
  return (
    <TreeItem
      isSelected={treeNode.id === selectedNode}
      isHovered={treeNode.id === hoveredNode}
      onClick={() => {
        onSelectNode(treeNode.id);
      }}
      item={treeNode}>
      {/*{arrow}*/}
      {defaultIcon(treeNode)}
      <HighlightedText text={treeNode.name} />
    </TreeItem>
  );
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

function HighlightedText(props: {text: string}) {
  const highlightManager: HighlightManager = useHighlighter();
  return <span>{highlightManager.render(props.text)}</span>;
}

function defaultIcon(node: UINode) {
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
  expanded: Set<Id>,
): TreeNode[] {
  const stack = [[nodes.get(rootId), 0]] as [UINode, number][];

  const res = [] as TreeNode[];

  while (stack.length > 0) {
    const [cur, depth] = stack.pop()!!;

    res.push({
      ...cur,
      depth,
    });

    if (expanded.has(cur.id)) {
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
