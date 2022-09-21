/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Bounds, Id, Tag, UINode} from '../types';
import {styled, Layout, theme} from 'flipper-plugin';
import {Typography} from 'antd';

export const Visualization2D: React.FC<
  {
    root: Id;
    nodes: Map<Id, UINode>;
    hoveredNode?: Id;
    onSelectNode: (id: Id) => void;
  } & React.HTMLAttributes<HTMLDivElement>
> = ({root, nodes, hoveredNode, onSelectNode}) => {
  return (
    <Layout.Container gap="large">
      <Typography.Title>Visualizer</Typography.Title>

      <div
        style={{
          //this sets the reference frame for the absolute positioning
          //of the individual absolutely positioned nodes
          position: 'relative',
        }}>
        <Visualization2DNode
          isRoot
          nodeId={root}
          nodes={nodes}
          hoveredNode={hoveredNode}
          onSelectNode={onSelectNode}
        />
        ;
      </div>
    </Layout.Container>
  );
};

function Visualization2DNode({
  nodeId,
  nodes,
  isRoot,
  hoveredNode,
  onSelectNode,
}: {
  isRoot: boolean;
  nodeId: Id;
  nodes: Map<Id, UINode>;
  hoveredNode?: Id;
  onSelectNode: (id: Id) => void;
}) {
  const node = nodes.get(nodeId);

  if (!node) {
    return null;
  }

  const isHovered = hoveredNode === nodeId;

  let childrenIds: Id[] = [];

  if (!isHovered) {
    //if there is an active child don't draw the other children
    //this means we don't draw overlapping activities / tabs etc
    if (node.activeChild) {
      childrenIds = [node.activeChild];
    } else {
      childrenIds = node.children;
    }
  }

  const children = childrenIds.map((childId) => (
    <Visualization2DNode
      isRoot={false}
      key={childId}
      nodeId={childId}
      nodes={nodes}
      hoveredNode={hoveredNode}
      onSelectNode={onSelectNode}
    />
  ));

  const hasOverlappingChild = childrenIds
    .map((id) => nodes.get(id))
    .find((child) => child?.bounds?.x === 0 || child?.bounds?.y === 0);

  const isZeroWidthOrHeight =
    node.bounds?.height === 0 || node.bounds?.width === 0;
  return (
    <BoundsBox
      onClick={(e) => {
        e.stopPropagation();
        onSelectNode(nodeId);
      }}
      bounds={node.bounds}
      isRoot={isRoot}
      tags={node.tags}
      isHovered={isHovered}>
      {/* Dirty hack to avoid showing highly overlapping text */}
      {!hasOverlappingChild && !isZeroWidthOrHeight && node.bounds
        ? node.name
        : null}
      {children}
    </BoundsBox>
  );
}

const BoundsBox = styled.div<{
  bounds?: Bounds;
  isRoot: boolean;
  isHovered: boolean;
  tags: Tag[];
}>((props) => {
  const bounds = props.bounds ?? {x: 0, y: 0, width: 0, height: 0};
  return {
    // borderWidth: props.isRoot ? '5px' : '1px',
    cursor: 'pointer',
    borderWidth: '1px',
    //to offset the border
    margin: '-1px',
    borderColor: props.tags.includes('Declarative')
      ? 'green'
      : props.tags.includes('Native')
      ? 'blue'
      : 'black',
    borderStyle: 'solid',
    position: 'absolute',
    backgroundColor: props.isHovered ? theme.selectionBackgroundColor : 'white',
    //todo need to understand why its so big and needs halving
    left: bounds.x / 2,
    top: bounds.y / 2,
    width: bounds.width / 2,
    height: bounds.height / 2,
  };
});
