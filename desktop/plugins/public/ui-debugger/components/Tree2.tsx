/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Id, UINode} from '../types';
import React, {
  Ref,
  RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Atom,
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
import {reverse} from 'lodash/fp';

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

  const {treeNodes, refs} = useMemo(() => {
    const treeNodes = toTreeList(nodes, rootId, expandedNodes);

    const refs: React.RefObject<HTMLLIElement>[] = treeNodes.map(() =>
      React.createRef<HTMLLIElement>(),
    );

    return {treeNodes, refs};
  }, [expandedNodes, nodes, rootId]);

  const isUsingKBToScroll = useRef(false);

  useKeyboardShortcuts(
    treeNodes,
    refs,
    selectedNode,
    onSelectNode,
    isUsingKBToScroll,
  );

  useEffect(() => {
    if (selectedNode) {
      const idx = treeNodes.findIndex((node) => node.id === selectedNode);
      if (idx !== -1) {
        refs[idx].current?.scrollIntoView({
          block: 'nearest',
        });
      }
    }
  }, [refs, selectedNode, treeNodes]);
  return (
    <HighlightProvider
      text={searchTerm}
      highlightColor={theme.searchHighlightBackground.yellow}>
      <div
        onMouseLeave={() => {
          instance.uiState.hoveredNodes.set([]);
        }}>
        {treeNodes.map((treeNode, index) => (
          <TreeItemContainer
            innerRef={refs[index]}
            isUsingKBToScroll={isUsingKBToScroll}
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
  innerRef,
  isUsingKBToScroll,
  treeNode,
  selectedNode,
  onSelectNode,
}: {
  innerRef: Ref<any>;
  isUsingKBToScroll: RefObject<boolean>;
  treeNode: TreeNode;
  selectedNode?: Id;
  hoveredNode?: Id;
  onSelectNode: (node?: Id) => void;
}) {
  const instance = usePlugin(plugin);
  const isHovered = useIsHovered(treeNode.id);
  return (
    <TreeItem
      ref={innerRef}
      isSelected={treeNode.id === selectedNode}
      isHovered={isHovered}
      onMouseEnter={() => {
        if (isUsingKBToScroll.current === false) {
          instance.uiState.hoveredNodes.set([treeNode.id]);
        }
      }}
      onClick={() => {
        onSelectNode(treeNode.id);
      }}
      item={treeNode}>
      <ExpandedIconOrSpace
        expanded={treeNode.isExpanded}
        children={treeNode.children}
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

function ExpandedIconOrSpace(props: {
  onClick: () => void;
  expanded: boolean;
  children: Id[];
}) {
  return props.children.length > 0 ? (
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
  ) : (
    <div style={{width: '12px'}}></div>
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
      //since we do dfs and use a stack we have to reverse children to get the order correct
      for (const childId of reverse(cur.children)) {
        const child = nodes.get(childId);
        if (child != null) {
          stack.push([child, depth + 1]);
        }
      }
    }
  }

  return res;
}

function useKeyboardShortcuts(
  treeNodes: TreeNode[],
  refs: React.RefObject<HTMLLIElement>[],
  selectedNode: Id | undefined,
  onSelectNode: (id?: Id) => void,
  isUsingKBToScroll: React.MutableRefObject<boolean>,
) {
  const instance = usePlugin(plugin);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Enter': {
          const hoveredNode = head(instance.uiState.hoveredNodes.get());
          if (hoveredNode != null) {
            onSelectNode(hoveredNode);
          }

          break;
        }
        case 'ArrowRight': {
          event.preventDefault();

          instance.uiState.expandedNodes.update((draft) => {
            if (selectedNode) {
              draft.add(selectedNode);
            }
          });

          break;
        }
        case 'ArrowLeft': {
          event.preventDefault();
          instance.uiState.expandedNodes.update((draft) => {
            if (selectedNode) {
              draft.delete(selectedNode);
            }
          });
          break;
        }

        case 'ArrowDown':
        case 'ArrowUp':
          event.preventDefault();
          moveHoveredNodeUpOrDown(
            event.key,
            treeNodes,
            refs,
            instance.uiState.hoveredNodes,
            isUsingKBToScroll,
          );

          break;
      }
    };
    window.addEventListener('keydown', listener);
    return () => {
      window.removeEventListener('keydown', listener);
    };
  }, [
    refs,
    instance.uiState.expandedNodes,
    treeNodes,
    onSelectNode,
    selectedNode,
    instance.uiState.hoveredNodes,
    isUsingKBToScroll,
  ]);
}

export type UpOrDown = 'ArrowDown' | 'ArrowUp';

function moveHoveredNodeUpOrDown(
  direction: UpOrDown,
  treeNodes: TreeNode[],
  refs: React.RefObject<HTMLLIElement>[],
  hoveredNodes: Atom<Id[]>,
  isUsingKBToScroll: React.MutableRefObject<boolean>,
) {
  const curIdx = treeNodes.findIndex(
    (item) => item.id === head(hoveredNodes.get()),
  );
  if (curIdx != -1) {
    const increment = direction === 'ArrowDown' ? 1 : -1;
    const newIdx = curIdx + increment;
    if (newIdx >= 0 && newIdx < treeNodes.length) {
      const newNode = treeNodes[newIdx];
      hoveredNodes.set([newNode.id]);

      const newNodeDomRef = refs[newIdx].current;
      /**
       * The reason for this grossness is that when scrolling to an element via keyboard, it will move a new dom node
       * under the cursor which will trigger the onmouseenter event for that node even if the mouse never actually was moved.
       * This will in turn cause that event handler to hover that node rather than the one the user is trying to get to via keyboard.
       * This is a dubious way to work around this. Effectively set this flag for a few hundred milliseconds after using keyboard movement
       * to disable the onmouseenter -> hover behaviour temporarily
       */
      isUsingKBToScroll.current = true;
      newNodeDomRef?.scrollIntoView({block: 'nearest'});
      setTimeout(() => {
        isUsingKBToScroll.current = false;
      }, 250);
    }
  }
}
