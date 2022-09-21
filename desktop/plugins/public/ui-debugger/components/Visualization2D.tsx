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
import {styled, Layout} from 'flipper-plugin';
import {Typography} from 'antd';

export const Visualization2D: React.FC<
  {root: Id; nodes: Map<Id, UINode>} & React.HTMLAttributes<HTMLDivElement>
> = ({root, nodes}) => {
  //
  const bounds = nodes.get(root)?.bounds;
  const rootBorderStyle = bounds
    ? {
        borderWidth: '3px',
        margin: '-3px',
        borderStyle: 'solid',
        borderColor: 'black',
        width: bounds.width / 2,
        height: bounds.height / 2,
      }
    : {};
  return (
    <Layout.Container gap="large">
      <Typography.Title>Visualizer</Typography.Title>
      <div
        style={{
          //this sets the reference frame for the absolute positioning
          //of the nodes
          position: 'relative',
          // ...rootBorderStyle,
        }}>
        <VisualizationNode isRoot nodeId={root} nodes={nodes} />;
      </div>
    </Layout.Container>
  );
};

function VisualizationNode({
  nodeId,
  nodes,
  isRoot,
}: {
  isRoot: boolean;
  nodeId: Id;
  nodes: Map<Id, UINode>;
}) {
  const node = nodes.get(nodeId);

  if (!node) {
    return null;
  }

  let childrenIds = node.children;

  //if there is an active child dont draw the other children
  //this means we don't draw overlapping activities / tabs
  if (node.activeChild) {
    childrenIds = [node.activeChild];
  }
  const children = childrenIds.map((childId) => (
    <VisualizationNode
      isRoot={false}
      key={childId}
      nodeId={childId}
      nodes={nodes}
    />
  ));

  const hasOverlappingChild = childrenIds
    .map((id) => nodes.get(id))
    .find((child) => child?.bounds?.x === 0 || child?.bounds?.y === 0);

  const isZeroWidthOrHeight =
    node.bounds?.height === 0 || node.bounds?.width === 0;
  return (
    <BoundsBox bounds={node.bounds} isRoot={isRoot} tags={node.tags}>
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
  tags: Tag[];
}>((props) => {
  const bounds = props.bounds ?? {x: 0, y: 0, width: 0, height: 0};
  return {
    // borderWidth: props.isRoot ? '5px' : '1px',
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
    //todo need to understand why its so big and needs halving
    left: bounds.x / 2,
    top: bounds.y / 2,
    width: bounds.width / 2,
    height: bounds.height / 2,
  };
});
