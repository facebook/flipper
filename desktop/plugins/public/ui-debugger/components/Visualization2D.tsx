/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Bounds, Coordinate, Id, NestedNode, Tag, UINode} from '../types';

import {produce, styled, theme, usePlugin, useValue} from 'flipper-plugin';
import {plugin} from '../index';
import {head, isEqual, throttle} from 'lodash';
import {Dropdown, Menu} from 'antd';

export const Visualization2D: React.FC<
  {
    rootId: Id;
    nodes: Map<Id, UINode>;
    selectedNode?: Id;
    onSelectNode: (id?: Id) => void;
    modifierPressed: boolean;
  } & React.HTMLAttributes<HTMLDivElement>
> = ({rootId, nodes, selectedNode, onSelectNode, modifierPressed}) => {
  const rootNodeRef = useRef<HTMLDivElement>();
  const instance = usePlugin(plugin);

  const snapshot = useValue(instance.snapshot);
  const focusedNodeId = useValue(instance.focusedNode);

  const focusState = useMemo(() => {
    const rootNode = toNestedNode(rootId, nodes);
    return rootNode && caclulateFocusState(rootNode, focusedNodeId);
  }, [focusedNodeId, rootId, nodes]);

  useEffect(() => {
    const mouseListener = throttle((ev: MouseEvent) => {
      const domRect = rootNodeRef.current?.getBoundingClientRect();

      if (!focusState || !domRect || instance.isContextMenuOpen.get()) {
        return;
      }
      const rawMouse = {x: ev.clientX, y: ev.clientY};

      if (!boundsContainsCoordinate(domRect, rawMouse)) {
        return;
      }

      //make the mouse coord relative to the dom rect of the visualizer

      const offsetMouse = offsetCoordinate(rawMouse, domRect);
      const scaledMouse = {
        x: offsetMouse.x * pxScaleFactor,
        y: offsetMouse.y * pxScaleFactor,
      };

      const hitNodes = hitTest(focusState.focusedRoot, scaledMouse).map(
        (node) => node.id,
      );

      if (
        hitNodes.length > 0 &&
        !isEqual(hitNodes, instance.hoveredNodes.get())
      ) {
        instance.hoveredNodes.set(hitNodes);
      }
    }, MouseThrottle);
    window.addEventListener('mousemove', mouseListener);

    return () => {
      window.removeEventListener('mousemove', mouseListener);
    };
  }, [instance.hoveredNodes, focusState, nodes, instance.isContextMenuOpen]);

  if (!focusState) {
    return null;
  }

  const snapshotNode = snapshot && nodes.get(snapshot.nodeId);

  return (
    <ContextMenu nodes={nodes}>
      <div
        //this div is to ensure that the size of the visualiser doesnt change when focusings on a subtree
        style={{
          width: toPx(focusState.actualRoot.bounds.width),
          height: toPx(focusState.actualRoot.bounds.height),
        }}>
        <div
          ref={rootNodeRef as any}
          onMouseLeave={(e) => {
            e.stopPropagation();
            //the context menu triggers this callback but we dont want to remove hover effect
            if (!instance.isContextMenuOpen.get()) {
              instance.hoveredNodes.set([]);
            }
          }}
          style={{
            /**
             * This relative position is so the rootNode visualization 2DNode and outer border has a non static element to
             * position itself relative to.
             *
             * Subsequent Visualization2DNode are positioned relative to their parent as each one is position absolute
             * which despite the name acts are a reference point for absolute positioning...
             *
             * When focused the global offset of the focussed node is used to offset and size this 'root' node
             */
            position: 'relative',
            marginLeft: toPx(focusState.focusedRootGlobalOffset.x),
            marginTop: toPx(focusState.focusedRootGlobalOffset.y),
            width: toPx(focusState.focusedRoot.bounds.width),
            height: toPx(focusState.focusedRoot.bounds.height),
            overflow: 'hidden',
          }}>
          {snapshotNode && (
            <img
              src={'data:image/png;base64,' + snapshot.base64Image}
              style={{
                marginLeft: toPx(-focusState.focusedRootGlobalOffset.x),
                marginTop: toPx(-focusState.focusedRootGlobalOffset.y),
                width: toPx(snapshotNode.bounds.width),
                height: toPx(snapshotNode.bounds.height),
              }}
            />
          )}
          <MemoedVisualizationNode2D
            node={focusState.focusedRoot}
            selectedNode={selectedNode}
            onSelectNode={onSelectNode}
            modifierPressed={modifierPressed}
          />
        </div>
      </div>
    </ContextMenu>
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
  selectedNode,
  onSelectNode,
  modifierPressed,
}: {
  node: NestedNode;
  modifierPressed: boolean;
  selectedNode?: Id;
  onSelectNode: (id?: Id) => void;
}) {
  const instance = usePlugin(plugin);

  const [isHovered, setIsHovered] = useState(false);
  useEffect(() => {
    const listener = (newValue?: Id[], prevValue?: Id[]) => {
      if (head(prevValue) === node.id || head(newValue) === node.id) {
        setIsHovered(head(newValue) === node.id);
      }
    };
    instance.hoveredNodes.subscribe(listener);
    return () => {
      instance.hoveredNodes.unsubscribe(listener);
    };
  }, [instance.hoveredNodes, node.id]);

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

        const hoveredNodes = instance.hoveredNodes.get();
        if (hoveredNodes[0] === selectedNode) {
          onSelectNode(undefined);
        } else {
          onSelectNode(hoveredNodes[0]);
        }
      }}>
      <NodeBorder hovered={isHovered} tags={node.tags}></NodeBorder>
      {isHovered && <p style={{float: 'right'}}>{node.name}</p>}
      {children}
    </div>
  );
}

const ContextMenu: React.FC<{nodes: Map<Id, UINode>}> = ({children}) => {
  const instance = usePlugin(plugin);

  const focusedNodeId = useValue(instance.focusedNode);
  const hoveredNodeId = head(useValue(instance.hoveredNodes));
  const nodes = useValue(instance.nodes);
  const hoveredNode = hoveredNodeId ? nodes.get(hoveredNodeId) : null;
  const isMenuOpen = useValue(instance.isContextMenuOpen);

  return (
    <Dropdown
      onVisibleChange={(open) => {
        instance.isContextMenuOpen.set(open);
      }}
      trigger={['contextMenu']}
      overlay={() => {
        return (
          <Menu>
            {isMenuOpen && hoveredNode?.id !== focusedNodeId && (
              <Menu.Item
                key="focus"
                onClick={() => {
                  instance.focusedNode.set(hoveredNode?.id);
                  instance.isContextMenuOpen.set(false);
                }}>
                Focus {hoveredNode?.name}
              </Menu.Item>
            )}
            {isMenuOpen && focusedNodeId != null && (
              <Menu.Item
                key="remove-focus"
                onClick={() => {
                  instance.focusedNode.set(undefined);
                  instance.isContextMenuOpen.set(false);
                }}>
                Remove focus
              </Menu.Item>
            )}
          </Menu>
        );
      }}>
      {children}
    </Dropdown>
  );
};

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

type FocusState = {
  actualRoot: NestedNode;
  focusedRoot: NestedNode;
  focusedRootGlobalOffset: Coordinate;
};

function caclulateFocusState(root: NestedNode, target?: Id): FocusState {
  const rootFocusState = {
    actualRoot: root,
    focusedRoot: root,
    focusedRootGlobalOffset: {x: 0, y: 0},
  };
  if (target == null) {
    return rootFocusState;
  }
  return (
    findNodeAndGlobalOffsetRec(root, {x: 0, y: 0}, root, target) ||
    rootFocusState
  );
}

function findNodeAndGlobalOffsetRec(
  node: NestedNode,
  globalOffset: Coordinate,
  root: NestedNode,
  target: Id,
): FocusState | undefined {
  const nextOffset = {
    x: globalOffset.x + node.bounds.x,
    y: globalOffset.y + node.bounds.y,
  };
  if (node.id === target) {
    //since we have already applied the this nodes offset to the root node in the visualiser we zero it out here so it isn't counted twice
    const focusedRoot = produce(node, (draft) => {
      draft.bounds.x = 0;
      draft.bounds.y = 0;
    });
    return {
      actualRoot: root,
      focusedRoot,
      focusedRootGlobalOffset: nextOffset,
    };
  }

  for (const child of node.children) {
    const offset = findNodeAndGlobalOffsetRec(child, nextOffset, root, target);
    if (offset != null) {
      return offset;
    }
  }
  return undefined;
}

function hitTest(node: NestedNode, mouseCoordinate: Coordinate): NestedNode[] {
  const res: NestedNode[] = [];

  function hitTestRec(node: NestedNode, mouseCoordinate: Coordinate): boolean {
    const nodeBounds = node.bounds;

    const thisNodeHit = boundsContainsCoordinate(nodeBounds, mouseCoordinate);

    let children = node.children;

    if (node.activeChildIdx != null) {
      children = [node.children[node.activeChildIdx]];
    }
    const offsetMouseCoord = offsetCoordinate(mouseCoordinate, nodeBounds);
    let childHit = false;

    for (const child of children) {
      childHit = hitTestRec(child, offsetMouseCoord) || childHit;
    }

    const hit = thisNodeHit && !childHit;
    if (hit) {
      res.push(node);
    }

    return hit;
  }

  hitTestRec(node, mouseCoordinate);

  return res.sort((a, b) => {
    const areaA = a.bounds.height * a.bounds.width;
    const areaB = b.bounds.height * b.bounds.width;
    if (areaA > areaB) {
      return 1;
    } else if (areaA < areaB) {
      return -1;
    } else {
      return 0;
    }
  });
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
