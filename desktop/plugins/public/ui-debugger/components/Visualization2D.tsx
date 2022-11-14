/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Bounds,
  Coordinate,
  Id,
  NestedNode,
  Snapshot,
  Tag,
  UINode,
} from '../types';

import {styled, theme, usePlugin, Atom} from 'flipper-plugin';
import {plugin} from '../index';
import {throttle} from 'lodash';

export const Visualization2D: React.FC<
  {
    rootId: Id;
    nodes: Map<Id, UINode>;
    snapshots: Map<Id, Snapshot>;
    selectedNode?: Id;
    onSelectNode: (id?: Id) => void;
    modifierPressed: boolean;
  } & React.HTMLAttributes<HTMLDivElement>
> = ({
  rootId,
  nodes,
  snapshots,
  selectedNode,
  onSelectNode,
  modifierPressed,
}) => {
  const root = useMemo(() => toNestedNode(rootId, nodes), [rootId, nodes]);
  const rootNodeRef = useRef<HTMLDivElement>();
  const instance = usePlugin(plugin);

  useEffect(() => {
    const mouseListener = throttle((ev: MouseEvent) => {
      const domRect = rootNodeRef.current?.getBoundingClientRect();
      if (!root || !domRect) {
        return;
      }

      //make the mouse coord relative to the dom rect of the visualizer
      const offsetMouse = offsetCoordinate(
        {x: ev.clientX, y: ev.clientY},
        domRect,
      );
      const scaledMouse = {
        x: offsetMouse.x * pxScaleFactor,
        y: offsetMouse.y * pxScaleFactor,
      };

      const targeted = hitTest(root, scaledMouse, root.bounds);
      if (targeted && targeted.id !== instance.hoveredNode.get()) {
        instance.hoveredNode.set(targeted.id);
      }
    }, MouseThrottle);
    window.addEventListener('mousemove', mouseListener);

    return () => {
      window.removeEventListener('mousemove', mouseListener);
    };
  }, [instance.hoveredNode, root]);

  if (!root) {
    return null;
  }

  return (
    <div
      ref={rootNodeRef as any}
      onMouseLeave={(e) => {
        e.stopPropagation();
        instance.hoveredNode.set(undefined);
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
        width: toPx(root.bounds.width),
        height: toPx(root.bounds.height),
        overflow: 'hidden',
      }}>
      <OuterBorder />
      <MemoedVisualizationNode2D
        node={root}
        snapshots={snapshots}
        selectedNode={selectedNode}
        onSelectNode={onSelectNode}
        modifierPressed={modifierPressed}
      />
    </div>
  );
};

const MemoedVisualizationNode2D = React.memo(
  Visualization2DNode,
  (prev, next) => {
    return (
      prev.node === next.node &&
      prev.modifierPressed === next.modifierPressed &&
      prev.selectedNode === next.selectedNode
    );
  },
);

function Visualization2DNode({
  node,
  snapshots,
  selectedNode,
  onSelectNode,
  modifierPressed,
}: {
  node: NestedNode;
  snapshots: Map<Id, Snapshot>;
  modifierPressed: boolean;
  selectedNode?: Id;
  onSelectNode: (id?: Id) => void;
}) {
  const snapshot = snapshots.get(node.id);
  const instance = usePlugin(plugin);

  const [isHovered, setIsHovered] = useState(false);
  useEffect(() => {
    const listener = (newValue?: Id, prevValue?: Id) => {
      if (prevValue === node.id || newValue === node.id) {
        setIsHovered(newValue === node.id);
      }
    };
    instance.hoveredNode.subscribe(listener);
    return () => {
      instance.hoveredNode.unsubscribe(listener);
    };
  }, [instance.hoveredNode, node.id]);

  const isSelected = selectedNode === node.id;

  let nestedChildren: NestedNode[];

  //if there is an active child don't draw the other children
  //this means we don't draw overlapping activities / tabs etc
  if (node.activeChildIdx) {
    nestedChildren = [node.children[node.activeChildIdx]];
  } else {
    nestedChildren = node.children;
  }

  // stop drawing children if hovered with the modifier so you
  // can see parent views without their children getting in the way
  if (isHovered && modifierPressed) {
    nestedChildren = [];
  }

  const children = nestedChildren.map((child) => (
    <MemoedVisualizationNode2D
      key={child.id}
      node={child}
      snapshots={snapshots}
      onSelectNode={onSelectNode}
      selectedNode={selectedNode}
      modifierPressed={modifierPressed}
    />
  ));

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
        opacity: isSelected ? 0.5 : 1,
        backgroundColor: isSelected
          ? theme.selectionBackgroundColor
          : 'transparent',
      }}
      onClick={(e) => {
        e.stopPropagation();

        const hoveredNode = instance.hoveredNode.get();
        if (hoveredNode === selectedNode) {
          onSelectNode(undefined);
        } else {
          onSelectNode(hoveredNode);
        }
      }}>
      <NodeBorder hovered={isHovered} tags={node.tags}></NodeBorder>
      {snapshot && (
        <img
          src={'data:image/jpeg;base64,' + snapshot}
          style={{maxWidth: '100%'}}
        />
      )}
      {isHovered && <p style={{float: 'right'}}>{node.name}</p>}
      {children}
    </div>
  );
}

/**
 * this is the border that shows the green or blue line, it is implemented as a sibling to the
 * node itself so that it has the same size but the border doesnt affect the sizing of its children
 * as border is part of the box model
 */
const NodeBorder = styled.div<{tags: Tag[]; hovered: boolean}>((props) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  borderWidth: props.hovered ? '2px' : '1px',
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

const pxScaleFactor = 2;
const MouseThrottle = 32;

function toPx(n: number) {
  return `${n / pxScaleFactor}px`;
}

function toNestedNode(
  rootId: Id,
  nodes: Map<Id, UINode>,
): NestedNode | undefined {
  function uiNodeToNestedNode(node: UINode): NestedNode {
    const activeChildIdx = node.activeChild
      ? node.children.indexOf(node.activeChild)
      : undefined;

    return {
      id: node.id,
      name: node.name,
      attributes: node.attributes,
      children: node.children
        .map((childId) => nodes.get(childId))
        .filter((child) => child != null)
        .map((child) => uiNodeToNestedNode(child!!)),
      bounds: node.bounds,
      tags: node.tags,
      activeChildIdx: activeChildIdx,
    };
  }

  const root = nodes.get(rootId);
  return root ? uiNodeToNestedNode(root) : undefined;
}

function hitTest(
  node: NestedNode,
  mouseCoordinate: Coordinate,
  parentBounds: Bounds,
): NestedNode | undefined {
  const nodeBounds = node.bounds || parentBounds;

  if (boundsContainsCoordinate(nodeBounds, mouseCoordinate)) {
    let children = node.children;

    if (node.activeChildIdx) {
      children = [node.children[node.activeChildIdx]];
    }
    const offsetMouseCoord = offsetCoordinate(mouseCoordinate, nodeBounds);
    for (const child of children) {
      const childHit = hitTest(
        child,
        offsetMouseCoord,
        (parentBounds = nodeBounds),
      );
      if (childHit) {
        return childHit;
      }
    }

    return node;
  }

  return undefined;
}

function boundsContainsCoordinate(bounds: Bounds, coordinate: Coordinate) {
  return (
    coordinate.x >= bounds.x &&
    coordinate.x <= bounds.x + bounds.width &&
    coordinate.y >= bounds.y &&
    coordinate.y <= bounds.y + bounds.height
  );
}

function offsetCoordinate(
  coordinate: Coordinate,
  offset: Coordinate,
): Coordinate {
  return {
    x: coordinate.x - offset.x,
    y: coordinate.y - offset.y,
  };
}
