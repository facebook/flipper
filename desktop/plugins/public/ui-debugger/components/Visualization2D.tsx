/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Id, Tag, UINode} from '../types';
import {styled, Layout, theme} from 'flipper-plugin';
import {Typography} from 'antd';

export const Visualization2D: React.FC<
  {
    root: Id;
    nodes: Map<Id, UINode>;
    hoveredNode?: Id;
    selectedNode?: Id;
    onSelectNode: (id: Id) => void;
    onHoverNode: (id?: Id) => void;
    modifierPressed: boolean;
  } & React.HTMLAttributes<HTMLDivElement>
> = ({
  root,
  nodes,
  hoveredNode,
  selectedNode,
  onSelectNode,
  onHoverNode,
  modifierPressed,
}) => {
  //todo, do a bfs search for the first bounds found
  const rootBounds = nodes.get(root)?.bounds;

  if (!rootBounds) {
    return null;
  }
  return (
    <Layout.Container gap="large">
      <Typography.Title>Visualizer</Typography.Title>

      <div
        onMouseLeave={(e) => {
          e.stopPropagation();
          onHoverNode(undefined);
        }}
        style={{
          /**
           * This relative position is so the root visualization 2DNode and outer border has a non static element to
           * position itself relative to.
           *
           * Subsequent Visualization2DNode are positioned relative to their parent as each one is position absolute
           * which despite the name acts are a reference point for absolute positioning...
           */
          position: 'relative',
          width: toPx(rootBounds.width),
          height: toPx(rootBounds.height),
        }}>
        <OuterBorder />
        <Visualization2DNode
          nodeId={root}
          nodes={nodes}
          hoveredNode={hoveredNode}
          selectedNode={selectedNode}
          onSelectNode={onSelectNode}
          onHoverNode={onHoverNode}
          modifierPressed={modifierPressed}
        />
      </div>
    </Layout.Container>
  );
};

function Visualization2DNode({
  parentId,
  nodeId,
  nodes,
  hoveredNode,
  selectedNode,
  onSelectNode,
  onHoverNode,
  modifierPressed,
}: {
  nodeId: Id;
  parentId?: Id;
  nodes: Map<Id, UINode>;
  modifierPressed: boolean;
  hoveredNode?: Id;
  selectedNode?: Id;
  onSelectNode: (id: Id) => void;
  onHoverNode: (id?: Id) => void;
}) {
  const node = nodes.get(nodeId);

  if (!node) {
    return null;
  }

  const isHovered = hoveredNode === nodeId;
  const isSelected = selectedNode === nodeId;

  let childrenIds: Id[] = [];

  //if there is an active child don't draw the other children
  //this means we don't draw overlapping activities / tabs etc
  if (node.activeChild) {
    childrenIds = [node.activeChild];
  } else {
    childrenIds = node.children;
  }
  // stop drawing children if hovered with the modifier so you
  // can see parent views without their children getting in the way
  if (isHovered && modifierPressed) {
    childrenIds = [];
  }

  const children = childrenIds.map((childId) => (
    <Visualization2DNode
      parentId={nodeId}
      key={childId}
      nodeId={childId}
      nodes={nodes}
      hoveredNode={hoveredNode}
      onSelectNode={onSelectNode}
      onHoverNode={onHoverNode}
      selectedNode={selectedNode}
      modifierPressed={modifierPressed}
    />
  ));

  const hasOverlappingChild = childrenIds
    .map((id) => nodes.get(id))
    .find((child) => child?.bounds?.x === 0 || child?.bounds?.y === 0);

  const isZeroWidthOrHeight =
    node.bounds?.height === 0 || node.bounds?.width === 0;

  const bounds = node.bounds ?? {x: 0, y: 0, width: 0, height: 0};

  return (
    <div
      role="button"
      tabIndex={0}
      style={{
        position: 'absolute',
        cursor: 'pointer',
        left: toPx(bounds.x),
        top: toPx(bounds.y),
        width: toPx(bounds.width),
        height: toPx(bounds.height),
        backgroundColor: isSelected
          ? theme.primaryColor
          : isHovered
          ? theme.selectionBackgroundColor
          : 'transparent',
      }}
      onMouseEnter={(e) => {
        e.stopPropagation();
        onHoverNode(nodeId);
      }}
      onMouseLeave={(e) => {
        e.stopPropagation();
        onHoverNode(parentId);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelectNode(nodeId);
      }}>
      <NodeBorder tags={node.tags}></NodeBorder>

      {/* Dirty hack to avoid showing highly overlapping text */}
      {!hasOverlappingChild && !isZeroWidthOrHeight && node.bounds
        ? node.name
        : null}
      {children}
    </div>
  );
}

/**
 * this is the border that shows the green or blue line, it is implemented as a sibling to the
 * node itself so that it has the same size but the border doesnt affect the sizing of its children
 * as border is part of the box model
 */
const NodeBorder = styled.div<{tags: Tag[]}>((props) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  borderWidth: '1px',
  borderStyle: 'solid',
  color: 'transparent',
  borderColor: props.tags.includes('Declarative')
    ? 'green'
    : props.tags.includes('Native')
    ? 'blue'
    : 'black',
}));

const outerBorderWidth = '10px';
const outerBorderOffset = `-${outerBorderWidth}`;

//this is the thick black border around the whole vizualization, the border goes around the content
//hence the top,left,right,botton being negative to increase its size
const OuterBorder = styled.div({
  boxSizing: 'border-box',
  position: 'absolute',
  top: outerBorderOffset,
  left: outerBorderOffset,
  right: outerBorderOffset,
  bottom: outerBorderOffset,
  borderWidth: outerBorderWidth,
  borderStyle: 'solid',
  borderColor: 'black',
  borderRadius: '10px',
});

function toPx(n: number) {
  return `${n / 2}px`;
}
