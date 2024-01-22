/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Id, ClientNode, NodeMap, MetadataId, Metadata} from '../../ClientTypes';
import {Color, OnSelectNode} from '../../DesktopTypes';
import React, {
  CSSProperties,
  Ref,
  RefObject,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import {
  HighlightManager,
  HighlightProvider,
  Layout,
  styled,
  theme,
  useHighlighter,
  usePlugin,
  useValue,
} from 'flipper-plugin';
import {plugin} from '../../index';
import {head, last} from 'lodash';
import {Badge, Tooltip, Typography} from 'antd';

import {useVirtualizer} from '@tanstack/react-virtual';
import {ContextMenu} from './ContextMenu';
import {
  MillisSinceEpoch,
  useKeyboardControlsCallback,
} from './useKeyboardControls';
import {toTreeList} from './toTreeList';
import {CaretDownOutlined, WarningOutlined} from '@ant-design/icons';

const {Text} = Typography;

type NodeIndentGuide = {
  depth: number;
  addHorizontalMarker: boolean;
  trimBottom: boolean;
  color: 'primary' | 'secondary';
};
export type TreeNode = ClientNode & {
  depth: number;
  idx: number;
  isExpanded: boolean;
  indentGuides: NodeIndentGuide[];
  frameworkEvents: number | null;
};
export function Tree2({
  nodes,
  metadata,
  rootId,
  additionalHeightOffset,
}: {
  additionalHeightOffset: number;
  nodes: NodeMap;
  metadata: Map<MetadataId, Metadata>;
  rootId: Id;
}) {
  const instance = usePlugin(plugin);
  const focusedNode = useValue(instance.uiState.focusedNode);
  const expandedNodes = useValue(instance.uiState.expandedNodes);
  const searchTerm = useValue(instance.uiState.searchTerm);
  const selectedNode = useValue(instance.uiState.selectedNode);
  const isContextMenuOpen = useValue(instance.uiState.isContextMenuOpen);
  const hoveredNode = head(useValue(instance.uiState.hoveredNodes));

  const filterMainThreadMonitoring = useValue(
    instance.uiState.filterMainThreadMonitoring,
  );
  const frameworkEventsMonitoring = useValue(
    instance.uiState.frameworkEventMonitoring,
  );
  const highlightedNodes = useValue(instance.uiState.highlightedNodes);

  const {treeNodes, refs} = useMemo(() => {
    const treeNodes = toTreeList(
      nodes,
      focusedNode || rootId,
      expandedNodes,
      selectedNode?.id,
      instance.frameworkEvents,
      frameworkEventsMonitoring,
      filterMainThreadMonitoring,
    );

    const refs: React.RefObject<HTMLLIElement>[] = treeNodes.map(() =>
      React.createRef<HTMLLIElement>(),
    );

    return {treeNodes, refs};
  }, [
    expandedNodes,
    filterMainThreadMonitoring,
    focusedNode,
    frameworkEventsMonitoring,
    instance.frameworkEvents,
    nodes,
    rootId,
    selectedNode?.id,
  ]);

  const isUsingKBToScrollUtill = useRef<MillisSinceEpoch>(0);

  const grandParentRef = useRef<HTMLDivElement>(null);
  const parentRef = React.useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: treeNodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => TreeItemHeightNumber,
    overscan: 20,
  });

  const prevSearchTerm = useRef<string | null>(null);
  useEffect(() => {
    if (prevSearchTerm.current === searchTerm) {
      return;
    }
    prevSearchTerm.current = searchTerm;
    const matchingNodesIds = findMatchingNodes(nodes, searchTerm);

    matchingNodesIds.forEach((id) => {
      instance.uiActions.ensureAncestorsExpanded(id);
    });

    if (matchingNodesIds.length > 0) {
      const firstTreeNode = treeNodes.find(searchPredicate(searchTerm));

      const idx = firstTreeNode?.idx;
      if (idx != null) {
        rowVirtualizer.scrollToIndex(idx, {align: 'start'});
      }
    }
  }, [instance.uiActions, nodes, rowVirtualizer, searchTerm, treeNodes]);

  useEffect(() => {
    //focus tree when an element is selected  via visualuser, keyboard controls are active,
    //when inputs in the sidebar are focused it will defocus the tree and yield kb controls
    //to the sidebar
    grandParentRef.current?.focus();
  }, [selectedNode]);

  const onKeyDown = useKeyboardControlsCallback(
    treeNodes,
    rowVirtualizer,
    selectedNode?.id,
    hoveredNode,
    instance.uiActions.onSelectNode,
    instance.uiActions.onHoverNode,
    instance.uiActions.onExpandNode,
    instance.uiActions.onCollapseNode,
    isUsingKBToScrollUtill,
  );

  const initialHeightOffset = useRef<number | null>(null);
  useLayoutEffect(() => {
    //the grand parent gets its size correclty via flex box, we use its initial
    //position to size the scroll parent ref for react virtual, It uses vh which accounts for window size changes
    //However  if we dynamically add content above or below we may need to revisit this approach
    const boundingClientRect = grandParentRef?.current?.getBoundingClientRect();

    if (initialHeightOffset.current == null) {
      //it is important to capture the initial height offset as we dont want to consider them again if elements are added dynamically later
      initialHeightOffset.current =
        // TODO: Fix this the next time the file is edited.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        boundingClientRect!!.top + // TODO: Fix this the next time the file is edited.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        (window.innerHeight - boundingClientRect!!.bottom) -
        additionalHeightOffset;
    }
    // TODO: Fix this the next time the file is edited.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    parentRef.current!!.style.height = `calc(100vh - ${initialHeightOffset.current}px - ${additionalHeightOffset}px )`;
  }, [additionalHeightOffset]);

  useLayoutEffect(() => {
    //scroll width is the width of the element including overflow, we grab the scroll width
    //of the parent scroll container and set each divs actual width to this to make sure the
    //size is correct for the selection and hover states

    const range = rowVirtualizer.range;
    const end = Math.min(
      refs.length,
      range.endIndex + 1, //need to add 1 extra otherwise last one doesnt get the treatment
    );

    const width = parentRef.current?.scrollWidth ?? 0;

    for (let i = range.startIndex; i < end; i++) {
      //set the width explicitly of all tree items to parent scroll width
      const ref = refs[i];
      if (ref.current) {
        ref.current.style.width = `${width}px`;
      }
    }
  });

  useLayoutEffect(() => {
    if (selectedNode != null) {
      const selectedTreeNode = treeNodes.find(
        (node) => node.id === selectedNode?.id,
      );

      const ref = parentRef.current;
      if (
        ref != null &&
        selectedTreeNode != null &&
        selectedNode?.source === 'visualiser'
      ) {
        ref.scrollLeft =
          Math.max(0, selectedTreeNode.depth - 10) * renderDepthOffset;

        let scrollToIndex = selectedTreeNode.idx;

        if (selectedTreeNode.idx > rowVirtualizer.range.endIndex) {
          //when scrolling down the scrollbar gets in the way if you scroll to the precise node
          scrollToIndex = Math.min(scrollToIndex + 1, treeNodes.length);
        }
        rowVirtualizer.scrollToIndex(scrollToIndex, {align: 'auto'});
      }
    }
    // NOTE: We don't want to add refs or tree nodes to the dependency list since when new data comes in over the wire
    // otherwise we will keep scrolling back to the selected node overriding the users manual scroll offset.
    // We only should scroll when selection changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNode, focusedNode]);

  return (
    <HighlightProvider
      text={searchTerm}
      highlightColor={theme.searchHighlightBackground.yellow}>
      <ContextMenu
        metadata={metadata}
        frameworkEvents={instance.frameworkEvents}
        focusedNodeId={focusedNode}
        hoveredNodeId={hoveredNode}
        nodes={nodes}
        onSelectNode={instance.uiActions.onSelectNode}
        onSetViewMode={instance.uiActions.onSetViewMode}
        onContextMenuOpen={instance.uiActions.onContextMenuOpen}
        onFocusNode={instance.uiActions.onFocusNode}
        onCollapseNonAncestors={instance.uiActions.onCollapseAllNonAncestors}
        onCollapseRecursively={instance.uiActions.onCollapseAllRecursively}
        onExpandRecursively={instance.uiActions.onExpandAllRecursively}>
        <div
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0} //this is for focusability (to allow keyboard navigation)
          onKeyDown={onKeyDown}
          //We use this normal divs flexbox sizing to measure how much vertical space we need for the child div
          ref={grandParentRef}
          style={{
            paddingLeft: theme.space.medium,
            height: '100%',
            width: '100%',
          }}>
          <div
            //this is scrollable div is expected by react virtual, see their docs
            ref={parentRef}
            style={{
              height: 0, //this get replaced by an effect
              overflow: 'auto',
            }}>
            <div
              //this is is the actual scrollable content, its height is faked by react virtual
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
              onMouseLeave={() => {
                if (isContextMenuOpen === false) {
                  instance.uiActions.onHoverNode();
                }
              }}>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => (
                <TreeNodeRow
                  transform={`translateY(${virtualRow.start}px)`}
                  innerRef={refs[virtualRow.index]}
                  key={virtualRow.index}
                  treeNode={treeNodes[virtualRow.index]}
                  highlightedNodes={highlightedNodes}
                  selectedNode={selectedNode?.id}
                  hoveredNode={hoveredNode}
                  isUsingKBToScroll={isUsingKBToScrollUtill}
                  isContextMenuOpen={isContextMenuOpen}
                  onSelectNode={instance.uiActions.onSelectNode}
                  onExpandNode={instance.uiActions.onExpandNode}
                  onCollapseNode={instance.uiActions.onCollapseNode}
                  onHoverNode={instance.uiActions.onHoverNode}
                />
              ))}
            </div>
          </div>
        </div>
      </ContextMenu>
    </HighlightProvider>
  );
}

const secondaryColor = theme.buttonDefaultBackground;
const GuideOffset = 11;

const IndentGuides = React.memo(
  ({
    isSelected,
    indentGuides,
    hasExpandChildrenIcon,
  }: {
    isSelected: boolean;
    hasExpandChildrenIcon: boolean;
    indentGuides: NodeIndentGuide[];
  }) => {
    const lastGuide = last(indentGuides);

    const lastGuidePadding = `${
      renderDepthOffset * (lastGuide?.depth ?? 0) + GuideOffset
    }px`;

    return (
      <div style={{pointerEvents: 'none'}}>
        {indentGuides.map((guide, idx) => {
          const indentGuideLinePadding = `${
            renderDepthOffset * guide.depth + GuideOffset
          }px`;

          const isLastGuide = idx === indentGuides.length - 1;
          const drawHalfprimary = isSelected && isLastGuide;

          const firstHalf =
            guide.color === 'primary' ? theme.primaryColor : secondaryColor;

          const secondHalf = guide.trimBottom
            ? 'transparent'
            : guide.color === 'primary' && !drawHalfprimary
              ? theme.primaryColor
              : secondaryColor;

          return (
            <div
              key={guide.depth}
              style={{
                position: 'absolute',
                width: indentGuideLinePadding,
                height: TreeItemHeight,
                borderRight: `1px solid`,
                borderImageSource: `linear-gradient(to bottom, ${firstHalf} 50%, ${secondHalf} 50%)`,
                borderImageSlice: 1,
              }}
            />
          );
        })}
        {lastGuide?.addHorizontalMarker && (
          <div
            style={{
              position: 'absolute',
              width: hasExpandChildrenIcon
                ? renderDepthOffset / 2
                : renderDepthOffset,
              height: HalfTreeItemHeight,
              borderBottom: `1px solid ${
                lastGuide.color === 'primary'
                  ? theme.primaryColor
                  : secondaryColor
              }`,
              marginLeft: lastGuidePadding,
            }}></div>
        )}
      </div>
    );
  },
  (props, nextProps) =>
    props.hasExpandChildrenIcon === nextProps.hasExpandChildrenIcon &&
    props.indentGuides === nextProps.indentGuides &&
    props.isSelected === nextProps.isSelected,
);

function TreeNodeRow({
  transform,
  innerRef,
  treeNode,
  highlightedNodes,
  selectedNode,
  hoveredNode,
  isUsingKBToScroll: isUsingKBToScrollUntill,
  isContextMenuOpen,
  onSelectNode,
  onExpandNode,
  onCollapseNode,
  onHoverNode,
}: {
  transform: string;
  innerRef: Ref<any>;
  treeNode: TreeNode;
  highlightedNodes: Map<Id, Color>;
  selectedNode?: Id;
  hoveredNode?: Id;
  isUsingKBToScroll: RefObject<MillisSinceEpoch>;
  isContextMenuOpen: boolean;
  onSelectNode: OnSelectNode;
  onExpandNode: (node: Id) => void;
  onCollapseNode: (node: Id) => void;
  onHoverNode: (node: Id) => void;
}) {
  const showExpandChildrenIcon = treeNode.children.length > 0;
  const isSelected = treeNode.id === selectedNode;
  const expandOrCollapse = () => {
    if (treeNode.isExpanded) {
      onCollapseNode(treeNode.id);
    } else {
      onExpandNode(treeNode.id);
    }
  };
  return (
    <div
      ref={innerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        height: TreeItemHeight,
        transform: transform,
        //Due to absolute positioning width is set outside of react via a useLayoutEffect in parent
      }}>
      <IndentGuides
        isSelected={isSelected}
        hasExpandChildrenIcon={showExpandChildrenIcon}
        indentGuides={treeNode.indentGuides}
      />

      <TreeNodeContent
        highlightColor={highlightedNodes.get(treeNode.id)}
        isSelected={isSelected}
        isHovered={hoveredNode === treeNode.id}
        onMouseEnter={() => {
          const kbIsNoLongerReservingScroll =
            new Date().getTime() > (isUsingKBToScrollUntill.current ?? 0);

          if (kbIsNoLongerReservingScroll && isContextMenuOpen == false) {
            onHoverNode(treeNode.id);
          }
        }}
        onClick={(event) => {
          if (event.detail === 1) {
            //single click
            onSelectNode(treeNode.id, 'tree');
          } else if (event.detail === 2) {
            //double click
            expandOrCollapse();
          }
        }}
        item={treeNode}
        style={{overflow: 'visible'}}>
        <ExpandedIconOrSpace
          expanded={treeNode.isExpanded}
          showIcon={showExpandChildrenIcon}
          onClick={expandOrCollapse}
        />

        {nodeIcon(treeNode)}
        <TreeNodeTextContent treeNode={treeNode} />
        {treeNode.frameworkEvents && (
          <Badge
            count={treeNode.frameworkEvents}
            style={{
              backgroundColor: theme.primaryColor,
              marginLeft: theme.space.small,
            }}
          />
        )}
      </TreeNodeContent>
    </div>
  );
}

function TreeNodeTextContent({treeNode}: {treeNode: TreeNode}) {
  const isZero = treeNode.bounds.width === 0 && treeNode.bounds.height === 0;
  const invisible = treeNode.hiddenAttributes?.['invisible'] === true;
  return (
    <Layout.Horizontal
      style={{
        fontFamily: 'monospace',
        opacity: isZero || invisible ? 0.5 : 1,
        alignItems: 'baseline',
        userSelect: 'none',
      }}>
      <HighlightedText text={treeNode.name} />
      <InlineAttributes attributes={treeNode.inlineAttributes} />
    </Layout.Horizontal>
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
        <TreeAttributeContainer key={key}>
          <span style={{color: theme.warningColor}}>
            {highlightManager.render(key)}
          </span>
          <span>={highlightManager.render(value)}</span>
        </TreeAttributeContainer>
      ))}
    </>
  );
}

const TreeItemHeightNumber = 24;
const TreeItemHeight = `${TreeItemHeightNumber}px`;
const HalfTreeItemHeight = `calc(${TreeItemHeight} / 2)`;

const TreeNodeContent = styled.li<{
  item: TreeNode;
  isHovered: boolean;
  isSelected: boolean;
  highlightColor?: string;
}>(({item, isHovered, isSelected, highlightColor}) => ({
  display: 'flex',
  alignItems: 'center',
  height: TreeItemHeight,
  paddingLeft: `${item.depth * renderDepthOffset}px`,
  borderWidth: '1px',
  borderRadius: '3px',
  borderColor: 'transparent',
  borderStyle: 'solid',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  opacity: highlightColor != null ? 0.6 : 1,
  backgroundColor:
    highlightColor != null
      ? highlightColor
      : isSelected
        ? theme.selectionBackgroundColor
        : isHovered
          ? theme.backgroundWash
          : theme.backgroundDefault,
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
        style={{
          display: 'flex',
          height: TreeItemHeight,
          width: 20,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={(e) => {
          e.stopPropagation();
          props.onClick();
        }}>
        <CaretDownOutlined
          style={{
            cursor: 'pointer',
            color: theme.textColorPlaceholder,
            fontSize: 14,
            transform: props.expanded ? '' : 'rotate(-90deg)',
          }}
        />
      </div>
    );
  } else {
    return (
      <div
        style={{
          width: 20,
          height: TreeItemHeight,
        }}></div>
    );
  }
}

function HighlightedText(props: {text: string}) {
  const highlightManager: HighlightManager = useHighlighter();
  return (
    <Typography.Text>{highlightManager.render(props.text)} </Typography.Text>
  );
}

function nodeIcon(node: TreeNode) {
  const [icon, tooltip] = nodeData(node);

  const iconComp =
    typeof icon === 'string' ? <NodeIconImage src={icon} /> : icon;

  if (tooltip == null) {
    return iconComp;
  } else {
    return <Tooltip title={tooltip}>{iconComp}</Tooltip>;
  }
}

function nodeData(node: TreeNode) {
  if (node.tags.includes('LithoMountable')) {
    return ['icons/litho-logo-blue.png', 'Litho Mountable (Primitive)'];
  } else if (node.tags.includes('Litho')) {
    return ['icons/litho-logo.png', 'Litho Component'];
  } else if (node.tags.includes('Compose')) {
    return ['icons/compose-logo.png', 'Compose Component'];
  } else if (node.tags.includes('CK')) {
    if (node.tags.includes('iOS')) {
      return ['icons/ck-mounted-logo.png', 'CK Mounted Component'];
    }
    return ['icons/ck-logo.png', 'CK Component'];
  } else if (node.tags.includes('BloksBoundTree')) {
    return ['facebook/bloks-logo-orange.png', 'Bloks Bridged component'];
  } else if (node.tags.includes('BloksDerived')) {
    return ['facebook/bloks-logo-blue.png', 'Bloks Derived (Server) component'];
  } else if (node.tags.includes('Warning')) {
    return [
      <WarningOutlined
        key="0"
        style={{...nodeiconStyle, color: theme.errorColor}}
      />,
      null,
    ];
  } else {
    return [
      <div
        key="0"
        style={{
          height: NodeIconSize,
          width: 0,
          marginRight: IconRightMargin,
        }}
      />,
      null,
    ];
  }
}

const NodeIconSize = 14;
const IconRightMargin = '4px';
const nodeiconStyle: CSSProperties = {
  height: NodeIconSize,
  width: NodeIconSize,
  marginRight: IconRightMargin,
  userSelect: 'none',
};
const NodeIconImage = styled.img({...nodeiconStyle});

const renderDepthOffset = 12;

function findMatchingNodes(nodes: NodeMap, searchTerm: string): Id[] {
  if (!searchTerm) {
    return [];
  }
  return [...nodes.values()]
    .filter(searchPredicate(searchTerm))
    .map((node) => node.id);
}

function searchPredicate(
  searchTerm: string,
): (node: ClientNode) => string | true | undefined {
  return (node: ClientNode): string | true | undefined =>
    node.name.toLowerCase().includes(searchTerm) ||
    Object.keys(node.inlineAttributes).find((inlineAttr) =>
      inlineAttr.toLocaleLowerCase().includes(searchTerm),
    ) ||
    Object.values(node.inlineAttributes).find((inlineAttr) =>
      inlineAttr.toLocaleLowerCase().includes(searchTerm),
    );
}
