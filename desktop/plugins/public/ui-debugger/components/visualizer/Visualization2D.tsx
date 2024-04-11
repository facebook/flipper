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
  ClientNode,
  SnapshotInfo,
  NodeMap,
} from '../../ClientTypes';
import {
  NestedNode,
  NodeSelection,
  TraversalMode,
  WireFrameMode,
} from '../../DesktopTypes';

import {
  produce,
  styled,
  theme,
  usePlugin,
  useValue,
  Layout,
} from 'flipper-plugin';
import {plugin} from '../../index';
import {isEqual, throttle} from 'lodash';
import {TargetModeState, VisualiserControls} from './VisualizerControls';
import {
  VisualiserOverlays,
  pxScaleFactorCssVar,
  toPx,
} from './VisualiserOverlays';

export const Visualization2D: React.FC<
  {
    nodes: Map<Id, ClientNode>;
    hideControls?: boolean;
    disableInteractivity?: boolean;
  } & React.HTMLAttributes<HTMLDivElement>
> = ({nodes, hideControls, disableInteractivity}) => {
  const instance = usePlugin(plugin);
  const snapshot = useValue(instance.snapshot);
  const snapshotNode = snapshot && nodes.get(snapshot.nodeId);
  const focusedNodeId = useValue(instance.uiState.focusedNode);
  const nodeSelection = useValue(instance.uiState.nodeSelection);
  const wireFrameMode = useValue(instance.uiState.wireFrameMode);

  const [alignmentModeEnabled, setAlignmentModeEnabled] = useState(false);
  const [boxVisualiserEnabled, setBoxVisualiserEnabled] = useState(false);

  const [targetMode, setTargetMode] = useState<TargetModeState>({
    state: 'disabled',
  });
  const focusState = useMemo(() => {
    //use the snapshot node as root since we cant realistically visualise any node above this
    const rootNode = snapshot && toNestedNode(snapshot.nodeId, nodes);
    return rootNode && caclulateFocusState(rootNode, focusedNodeId);
  }, [snapshot, nodes, focusedNodeId]);

  if (!focusState || !snapshotNode) {
    return null;
  }

  return (
    <Layout.Container grow>
      {!hideControls && (
        <VisualiserControls
          onSetWireFrameMode={instance.uiActions.onSetWireFrameMode}
          wireFrameMode={wireFrameMode}
          focusedNode={focusedNodeId}
          selectedNode={nodeSelection?.node}
          setTargetMode={setTargetMode}
          targetMode={targetMode}
          alignmentModeEnabled={alignmentModeEnabled}
          setAlignmentModeEnabled={setAlignmentModeEnabled}
          boxVisualiserEnabled={boxVisualiserEnabled}
          setBoxVisualiserEnabled={setBoxVisualiserEnabled}
        />
      )}
      <Visualization2DContent
        disableInteractivity={disableInteractivity ?? false}
        focusState={focusState}
        nodes={nodes}
        snapshotInfo={snapshot}
        snapshotNode={snapshotNode}
        targetMode={targetMode}
        setTargetMode={setTargetMode}
        wireframeMode={wireFrameMode}
        nodeSelection={nodeSelection}
        alignmentModeEnabled={alignmentModeEnabled}
        boxVisualiserEnabled={boxVisualiserEnabled}
      />
    </Layout.Container>
  );
};

const horizontalPadding = 8; //allows space for vertical scroll bar

function Visualization2DContent({
  disableInteractivity,
  snapshotInfo,
  snapshotNode,
  nodes,
  focusState,
  targetMode,
  setTargetMode,
  wireframeMode,
  nodeSelection,
  alignmentModeEnabled,
  boxVisualiserEnabled,
}: {
  targetMode: TargetModeState;
  setTargetMode: (targetMode: TargetModeState) => void;
  wireframeMode: WireFrameMode;
  nodeSelection?: NodeSelection;
  focusState: FocusState;
  nodes: NodeMap;
  snapshotNode: ClientNode;
  snapshotInfo: SnapshotInfo;
  disableInteractivity: boolean;
  alignmentModeEnabled: boolean;
  boxVisualiserEnabled: boolean;
}) {
  const instance = usePlugin(plugin);
  const rootNodeRef = useRef<HTMLDivElement>();

  const containerRef = useRef<HTMLDivElement>(null);
  const traversalMode = useValue(instance.uiState.traversalMode);

  const referenceImage = useValue(instance.uiState.referenceImage);

  const measuredWidth = useMeasuredWidth(containerRef);

  const availableWidthConsideringPadding =
    measuredWidth - horizontalPadding * 2;

  //this ref is to ensure the mouse has entered the visualiser, otherwise when you have overlapping modals
  //the hover state / tooltips all fire
  const visualizerActive = useRef(false);
  useEffect(() => {
    const mouseListener = throttle((ev: MouseEvent) => {
      const domRect = rootNodeRef.current?.getBoundingClientRect();

      if (
        disableInteractivity ||
        !focusState ||
        !domRect ||
        instance.uiState.isContextMenuOpen.get() ||
        !snapshotNode ||
        !visualizerActive.current
      ) {
        return;
      }
      const rawMouse = {x: ev.clientX, y: ev.clientY};

      if (!boundsContainsCoordinate(domRect, rawMouse)) {
        return;
      }

      //make the mouse coord relative to the dom rect of the visualizer
      const pxScaleFactor = calcPxScaleFactor(
        snapshotNode.bounds,
        availableWidthConsideringPadding,
      );

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
        !isEqual(hitNodes, instance.uiState.hoveredNodes.get())
      ) {
        instance.uiActions.onHoverNode(...hitNodes);
      }
    }, MouseThrottle);
    window.addEventListener('mousemove', mouseListener);

    return () => {
      window.removeEventListener('mousemove', mouseListener);
    };
  }, [
    instance.uiState.hoveredNodes,
    focusState,
    nodes,
    instance.uiState.isContextMenuOpen,
    snapshotNode,
    instance.uiActions,
    disableInteractivity,
    availableWidthConsideringPadding,
  ]);

  useEffect(() => {
    return instance.uiState.isContextMenuOpen.subscribe((value) => {
      if (value === false) {
        visualizerActive.current = true;
      }
    });
  }, [instance.uiState.isContextMenuOpen]);

  const pxScaleFactor = calcPxScaleFactor(
    snapshotNode.bounds,
    availableWidthConsideringPadding,
  );

  return (
    <Layout.ScrollContainer
      ref={containerRef}
      style={{
        paddingLeft: horizontalPadding,
        overflowY: 'scroll',
        scrollbarWidth: 'thin',
      }}
      vertical>
      <div
        onMouseLeave={(e) => {
          e.stopPropagation();
          //the context menu triggers this callback but we dont want to remove hover effect
          if (!instance.uiState.isContextMenuOpen.get()) {
            instance.uiActions.onHoverNode();
          }

          visualizerActive.current = false;
        }}
        onMouseEnter={() => {
          visualizerActive.current = true;
        }}
        //this div is to ensure that the size of the visualiser doesnt change when focusings on a subtree
        style={
          {
            backgroundColor: theme.backgroundWash,
            borderRadius: theme.borderRadius,
            overflowY: 'auto',
            overflowX: 'hidden',
            position: 'relative', //this is for the absolutely positioned overlays
            [pxScaleFactorCssVar]: pxScaleFactor,
            width: toPx(focusState.actualRoot.bounds.width),
            height: toPx(focusState.actualRoot.bounds.height),
          } as React.CSSProperties
        }>
        <VisualiserOverlays
          nodes={nodes}
          nodeSelection={nodeSelection}
          targetMode={targetMode}
          setTargetMode={setTargetMode}
          snapshotNode={snapshotNode}
          alignmentModeEnabled={alignmentModeEnabled}
          boxVisualiserEnabled={boxVisualiserEnabled}
        />
        <div
          ref={rootNodeRef as any}
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
          <img
            src={`data:image/png;base64,${snapshotInfo.data}`}
            style={{
              position: 'absolute',
              marginLeft: toPx(-focusState.focusedRootGlobalOffset.x),
              marginTop: toPx(-focusState.focusedRootGlobalOffset.y),
              width: toPx(snapshotNode.bounds.width),
              height: toPx(snapshotNode.bounds.height),
            }}
          />
          {referenceImage != null && (
            <img
              src={referenceImage.url}
              style={{
                position: 'absolute',
                opacity: referenceImage.opacity,
                marginLeft: toPx(-focusState.focusedRootGlobalOffset.x),
                marginTop: toPx(-focusState.focusedRootGlobalOffset.y),
                width: toPx(snapshotNode.bounds.width),
                height: toPx(snapshotNode.bounds.height),
              }}
            />
          )}

          <MemoedVisualizationWireframeNode
            wireframeMode={wireframeMode}
            isSelectedOrChildOrSelected={false}
            selectedNodeId={nodeSelection?.node.id}
            node={focusState.focusedRoot}
            traversalMode={traversalMode}
            runThroughIndex={0}
          />
        </div>
      </div>
    </Layout.ScrollContainer>
  );
}

const MemoedVisualizationWireframeNode = React.memo(
  VisualizationWireframeNode,
  (prev, next) => {
    if (prev.node != next.node || prev.wireframeMode != next.wireframeMode) {
      return false;
    }
    if (next.wireframeMode == 'All') {
      //if all wire frames are drawn and the root node is the same
      //then we are safe
      return true;
    } else {
      //with other modes the selected node affects the drawing
      return prev.selectedNodeId === next.selectedNodeId;
    }
  },
);

function VisualizationWireframeNode({
  wireframeMode,
  isSelectedOrChildOrSelected,
  selectedNodeId,
  node,
  runThroughIndex,
  traversalMode,
}: {
  wireframeMode: WireFrameMode;
  isSelectedOrChildOrSelected: boolean;
  selectedNodeId?: Id;
  node: NestedNode;

  runThroughIndex?: number;
  traversalMode: TraversalMode;
}) {
  const instance = usePlugin(plugin);

  const isSelected = node.id === selectedNodeId;
  const ref = useRef<HTMLDivElement>(null);
  let nestedChildren: NestedNode[];

  //if there is an active child don't draw the other children
  //this means we don't draw overlapping activities / tabs etc
  if (
    node.activeChildIdx != null &&
    node.activeChildIdx >= 0 &&
    node.activeChildIdx < node.children.length
  ) {
    nestedChildren = [node.children[node.activeChildIdx]];
  } else {
    nestedChildren = node.children;
  }

  const children = nestedChildren.map((child, index) => (
    <VisualizationWireframeNode
      wireframeMode={wireframeMode}
      selectedNodeId={selectedNodeId}
      isSelectedOrChildOrSelected={isSelected || isSelectedOrChildOrSelected}
      key={child.id}
      node={child}
      runThroughIndex={index + 1}
      traversalMode={traversalMode}
    />
  ));

  const highLightColor = useValue(instance.uiState.highlightedNodes).get(
    node.id,
  );

  const showBorder =
    wireframeMode === 'All' ||
    (wireframeMode === 'SelectedAndChildren' && isSelectedOrChildOrSelected) ||
    (wireframeMode === 'SelectedOnly' && isSelected);
  const showOrdinalIndices = traversalMode == 'accessibility-hierarchy';

  return (
    <div
      role="button"
      tabIndex={0}
      ref={ref}
      style={{
        position: 'absolute',
        cursor: 'pointer',
        left: toPx(node.bounds.x),
        top: toPx(node.bounds.y),
        width: toPx(node.bounds.width),
        height: toPx(node.bounds.height),
        opacity: highLightColor != null ? 0.7 : 1,
        backgroundColor: highLightColor,
      }}>
      {showBorder && <NodeBorder />}

      {children}
      {showOrdinalIndices && (
        <div
          style={{
            position: 'relative',
            width: '20px',
            height: '14px',
            fontFamily: 'monospace',
            borderRadius: '3px',
            display: 'flex',
            textAlign: 'center',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(2px)',
            border: '1px solid #00000081',
            fontSize: '0.6em',
            opacity: 0.8,
            background: 'white',
          }}>
          {runThroughIndex}
        </div>
      )}
    </div>
  );
}

/**
 * this is the border that shows the green or blue line, it is implemented as a sibling to the
 * node itself so that it has the same size but the border doesnt affect the sizing of its children
 * as border is part of the box model
 */
const NodeBorder = styled.div({
  position: 'absolute',
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  boxSizing: 'border-box',
  borderWidth: '1px',
  borderStyle: 'solid',
  color: 'transparent',
  borderColor: theme.disabledColor,
});

const MouseThrottle = 32;

function toNestedNode(
  rootId: Id,
  nodes: Map<Id, ClientNode>,
): NestedNode | undefined {
  function uiNodeToNestedNode(node: ClientNode): NestedNode {
    const nonNullChildren = node.children.filter(
      (childId) => nodes.get(childId) != null,
    );

    if (nonNullChildren.length !== node.children.length) {
      console.error(
        'Visualization2D.toNestedNode -> child is nullish!',
        node.children,
        nonNullChildren.map((childId) => {
          const child = nodes.get(childId);
          return child && uiNodeToNestedNode(child);
        }),
      );
    }

    const activeChildIdx = node.activeChild
      ? nonNullChildren.indexOf(node.activeChild)
      : undefined;

    return {
      id: node.id,
      name: node.name,
      attributes: node.attributes,
      children: nonNullChildren.map((childId) =>
        // TODO: Fix this the next time the file is edited.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        uiNodeToNestedNode(nodes.get(childId)!),
      ),
      bounds: node.bounds,
      tags: node.tags,
      activeChildIdx,
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
      const activeChild = node.children[node.activeChildIdx];
      if (activeChild == null) {
        console.error(
          `[ui-debugger] activeChildIdx not found for ${node.name}: ${node.activeChildIdx} not within ${node.children.length}`,
        );
      } else {
        children = [activeChild];
      }
    }
    const offsetMouseCoord = offsetCoordinate(mouseCoordinate, nodeBounds);
    let anyChildHitRecursive = false;

    for (const child of children) {
      anyChildHitRecursive =
        hitTestRec(child, offsetMouseCoord) || anyChildHitRecursive;
    }

    const hit = thisNodeHit && !anyChildHitRecursive;
    if (hit) {
      res.push(node);
    }

    return thisNodeHit || anyChildHitRecursive;
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

function calcPxScaleFactor(snapshotBounds: Bounds, availableWidth: number) {
  return snapshotBounds.width / availableWidth;
}

function useMeasuredWidth(ref: React.RefObject<HTMLDivElement>) {
  const [measuredWidth, setMeasuredWidth] = useState(0);

  useEffect(() => {
    if (ref.current == null) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setMeasuredWidth(entry.target.clientWidth);
      }
    });
    resizeObserver.observe(ref.current);
    setMeasuredWidth(ref.current.clientWidth);

    return () => resizeObserver.disconnect();
  }, [ref]);

  return measuredWidth;
}
