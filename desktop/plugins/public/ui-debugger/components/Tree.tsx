/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Id, UINode} from '../types';
import React, {Ref, RefObject, useEffect, useMemo, useRef} from 'react';
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
import {head, last} from 'lodash';
import {reverse} from 'lodash/fp';
import {Dropdown, Menu, Typography} from 'antd';
import {UIDebuggerMenuItem} from './util/UIDebuggerMenuItem';

const {Text} = Typography;

type LineStyle = 'ToParent' | 'ToChildren';

type NodeIndentGuide = {
  depth: number;
  style: LineStyle;
  addHorizontalMarker: boolean;
  trimBottom: boolean;
};
export type TreeNode = UINode & {
  depth: number;
  isExpanded: boolean;
  indentGuide: NodeIndentGuide | null;
};

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
  const focusedNode = useValue(instance.uiState.focusedNode);
  const expandedNodes = useValue(instance.uiState.expandedNodes);
  const searchTerm = useValue(instance.uiState.searchTerm);
  const isContextMenuOpen = useValue(instance.uiState.isContextMenuOpen);
  const hoveredNode = head(useValue(instance.uiState.hoveredNodes));

  const {treeNodes, refs} = useMemo(() => {
    const treeNodes = toTreeNodes(
      nodes,
      focusedNode || rootId,
      expandedNodes,
      selectedNode,
    );

    const refs: React.RefObject<HTMLLIElement>[] = treeNodes.map(() =>
      React.createRef<HTMLLIElement>(),
    );

    return {treeNodes, refs};
  }, [expandedNodes, focusedNode, nodes, rootId, selectedNode]);

  const isUsingKBToScroll = useRef(false);

  useKeyboardShortcuts(
    treeNodes,
    refs,
    selectedNode,
    hoveredNode,
    onSelectNode,
    instance.uiActions.onExpandNode,
    instance.uiActions.onCollapseNode,
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
      <ContextMenu
        focusedNode={focusedNode}
        hoveredNode={hoveredNode}
        nodes={nodes}
        onContextMenuOpen={instance.uiActions.onContextMenuOpen}
        onFocusNode={instance.uiActions.onFocusNode}>
        <div
          onMouseLeave={() => {
            if (isContextMenuOpen === false) {
              instance.uiState.hoveredNodes.set([]);
            }
          }}>
          {treeNodes.map((treeNode, index) => (
            <MemoTreeItemContainer
              innerRef={refs[index]}
              key={treeNode.id}
              treeNode={treeNode}
              selectedNode={selectedNode}
              hoveredNode={hoveredNode}
              isUsingKBToScroll={isUsingKBToScroll}
              isContextMenuOpen={isContextMenuOpen}
              onSelectNode={onSelectNode}
              onExpandNode={instance.uiActions.onExpandNode}
              onCollapseNode={instance.uiActions.onCollapseNode}
              onHoverNode={instance.uiActions.onHoverNode}
            />
          ))}
        </div>
      </ContextMenu>
    </HighlightProvider>
  );
}

const MemoTreeItemContainer = React.memo(
  TreeItemContainer,
  (prevProps, nextProps) => {
    const id = nextProps.treeNode.id;
    return (
      prevProps.treeNode === nextProps.treeNode &&
      prevProps.isContextMenuOpen === nextProps.isContextMenuOpen &&
      //make sure that prev or next hover/selected node doesnt concern this tree node
      prevProps.hoveredNode !== id &&
      nextProps.hoveredNode !== id &&
      prevProps.selectedNode !== id &&
      nextProps.selectedNode !== id
    );
  },
);

function IndentGuide({indentGuide}: {indentGuide: NodeIndentGuide}) {
  const verticalLinePadding = `${renderDepthOffset * indentGuide.depth + 8}px`;

  const verticalLineStyle = `${
    indentGuide.style === 'ToParent' ? 'dashed' : 'solid'
  }`;
  const horizontalLineStyle = `${
    indentGuide.style === 'ToParent' ? 'dotted' : 'solid'
  }`;

  const color = indentGuide.style === 'ToParent' ? '#B0B0B0' : '#C0C0C0';

  return (
    <div>
      <div
        style={{
          position: 'absolute',
          width: verticalLinePadding,
          height: indentGuide.trimBottom ? HalfTreeItemHeight : TreeItemHeight,
          borderRight: `1px ${verticalLineStyle} ${color}`,
        }}></div>
      {indentGuide.addHorizontalMarker && (
        <div
          style={{
            position: 'absolute',
            width: 8,
            height: HalfTreeItemHeight,
            borderBottom: `2px ${horizontalLineStyle} ${color}`,
            marginLeft: verticalLinePadding,
          }}></div>
      )}
    </div>
  );
}

function TreeItemContainer({
  innerRef,
  treeNode,
  selectedNode,
  hoveredNode,
  isUsingKBToScroll,
  isContextMenuOpen,
  onSelectNode,
  onExpandNode,
  onCollapseNode,
  onHoverNode,
}: {
  innerRef: Ref<any>;
  treeNode: TreeNode;
  selectedNode?: Id;
  hoveredNode?: Id;
  isUsingKBToScroll: RefObject<boolean>;
  isContextMenuOpen: boolean;
  onSelectNode: (node?: Id) => void;
  onExpandNode: (node: Id) => void;
  onCollapseNode: (node: Id) => void;
  onHoverNode: (node: Id) => void;
}) {
  return (
    <div>
      {treeNode.indentGuide != null && (
        <IndentGuide indentGuide={treeNode.indentGuide} />
      )}
      <TreeItemContent
        ref={innerRef}
        isSelected={treeNode.id === selectedNode}
        isHovered={hoveredNode === treeNode.id}
        onMouseEnter={() => {
          if (
            isUsingKBToScroll.current === false &&
            isContextMenuOpen == false
          ) {
            onHoverNode(treeNode.id);
          }
        }}
        onClick={() => {
          onSelectNode(treeNode.id);
        }}
        item={treeNode}>
        <ExpandedIconOrSpace
          expanded={treeNode.isExpanded}
          showIcon={treeNode.children.length > 0}
          onClick={() => {
            if (treeNode.isExpanded) {
              onCollapseNode(treeNode.id);
            } else {
              onExpandNode(treeNode.id);
            }
          }}
        />
        {nodeIcon(treeNode)}
        <HighlightedText text={treeNode.name} />
        <InlineAttributes attributes={treeNode.inlineAttributes} />
      </TreeItemContent>
    </div>
  );
}

const TreeAttributeContainer = styled(Text)({
  color: theme.textColorSecondary,
  fontWeight: 300,
  marginLeft: 5,
  fontSize: 12,
});

function InlineAttributes({attributes}: {attributes: Record<string, string>}) {
  const highlightManager: HighlightManager = useHighlighter();

  return (
    <>
      {Object.entries(attributes ?? {}).map(([key, value]) => (
        <>
          <TreeAttributeContainer key={key}>
            <span style={{color: theme.warningColor}}>{key}</span>
            <span>={highlightManager.render(value)}</span>
          </TreeAttributeContainer>
        </>
      ))}
    </>
  );
}

const TreeItemHeight = '26px';
const HalfTreeItemHeight = `calc(${TreeItemHeight} / 2)`;

const TreeItemContent = styled.li<{
  item: TreeNode;
  isHovered: boolean;
  isSelected: boolean;
}>(({item, isHovered, isSelected}) => ({
  display: 'flex',
  alignItems: 'baseline',
  height: TreeItemHeight,
  paddingLeft: `${item.depth * renderDepthOffset}px`,
  borderWidth: '1px',
  borderRadius: '3px',
  borderColor: isHovered ? theme.selectionBackgroundColor : 'transparent',
  borderStyle: 'solid',
  backgroundColor: isSelected ? theme.selectionBackgroundColor : theme.white,
}));

function ExpandedIconOrSpace(props: {
  onClick: () => void;
  expanded: boolean;
  showIcon: boolean;
}) {
  if (props.showIcon) {
    return (
      <div
        role="button"
        tabIndex={0}
        style={{display: 'flex'}}
        onClick={(e) => {
          e.stopPropagation();
          props.onClick();
        }}>
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
  } else {
    return <div style={{width: '16px'}}></div>;
  }
}

function HighlightedText(props: {text: string}) {
  const highlightManager: HighlightManager = useHighlighter();
  return <span>{highlightManager.render(props.text)}</span>;
}

function nodeIcon(node: UINode) {
  if (node.tags.includes('Litho')) {
    return <DecorationImage src="icons/litho-logo.png" />;
  } else if (node.tags.includes('CK')) {
    if (node.tags.includes('iOS')) {
      return <DecorationImage src="icons/ck-mounted-logo.png" />;
    }
    return <DecorationImage src="icons/ck-logo.png" />;
  }
}

const DecorationImage = styled.img({
  height: 12,
  marginRight: 5,
  width: 12,
});

const renderDepthOffset = 16;

const ContextMenu: React.FC<{
  nodes: Map<Id, UINode>;
  hoveredNode?: Id;
  focusedNode?: Id;
  onFocusNode: (id?: Id) => void;
  onContextMenuOpen: (open: boolean) => void;
}> = ({
  nodes,
  hoveredNode,
  children,
  focusedNode,
  onFocusNode,
  onContextMenuOpen,
}) => {
  return (
    <Dropdown
      onVisibleChange={(visible) => {
        onContextMenuOpen(visible);
      }}
      overlay={() => (
        <Menu>
          {hoveredNode != null && focusedNode !== hoveredNode && (
            <UIDebuggerMenuItem
              key="focus"
              text={`Focus ${nodes.get(hoveredNode)?.name}`}
              onClick={() => {
                onFocusNode(hoveredNode);
              }}
            />
          )}

          {focusedNode && (
            <UIDebuggerMenuItem
              key="remove-focus"
              text="Remove focus"
              onClick={() => {
                onFocusNode(undefined);
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

type TreeListStackItem = {
  node: UINode;
  depth: number;
  isChildOfSelectedNode: boolean;
  selectedNodeDepth: number;
};

function toTreeNodes(
  nodes: Map<Id, UINode>,
  rootId: Id,
  expandedNodes: Set<Id>,
  selectedNode: Id | undefined,
): TreeNode[] {
  const root = nodes.get(rootId);
  if (root == null) {
    return [];
  }
  const stack = [
    {node: root, depth: 0, isChildOfSelectedNode: false, selectedNodeDepth: 0},
  ] as TreeListStackItem[];

  const treeNodes = [] as TreeNode[];

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

    treeNodes.push({
      ...node,
      depth,
      isExpanded,
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

function useKeyboardShortcuts(
  treeNodes: TreeNode[],
  refs: React.RefObject<HTMLLIElement>[],
  selectedNode: Id | undefined,
  hoveredNode: Id | undefined,
  onSelectNode: (id?: Id) => void,
  onExpandNode: (id: Id) => void,
  onCollapseNode: (id: Id) => void,
  isUsingKBToScroll: React.MutableRefObject<boolean>,
) {
  const instance = usePlugin(plugin);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Enter': {
          if (hoveredNode != null) {
            onSelectNode(hoveredNode);
          }

          break;
        }

        case 'ArrowRight':
          event.preventDefault();
          if (hoveredNode) {
            onExpandNode(hoveredNode);
          }
          break;
        case 'ArrowLeft': {
          event.preventDefault();
          if (hoveredNode) {
            onCollapseNode(hoveredNode);
          }
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
    treeNodes,
    onSelectNode,
    selectedNode,
    isUsingKBToScroll,
    onExpandNode,
    onCollapseNode,
    instance.uiState.hoveredNodes,
    hoveredNode,
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
