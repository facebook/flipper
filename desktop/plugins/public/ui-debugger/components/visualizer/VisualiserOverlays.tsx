/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Coordinate, Id, ClientNode, NodeMap} from '../../ClientTypes';
import {NodeSelection} from '../../DesktopTypes';
import {styled, theme, usePlugin, useValue} from 'flipper-plugin';
import {plugin} from '../../index';
import {useDelay} from '../../hooks/useDelay';
import {Tooltip} from 'antd';
import {TargetModeState} from './VisualizerControls';
import {getNode} from '../../utils/map';
import {filterOutFalsy} from '../../utils/array';
import {head} from 'lodash';

export const pxScaleFactorCssVar = '--pxScaleFactor';

export function toPx(n: number) {
  return `calc(${n}px / var(${pxScaleFactorCssVar}))`;
}

/**
 * Most interactivity is moved to overlays, this makes the drawing of the wireframe itself simpler
 * and can be memo'd more effectively since it changes less often e.g changing hovered / selected noded
 *  only rerenders overlays not all of the wireframe boxes
 */
export function VisualiserOverlays({
  snapshotNode,
  nodeSelection,
  nodes,
  targetMode,
  setTargetMode,
  alignmentModeEnabled,
  boxVisualiserEnabled,
}: {
  snapshotNode: ClientNode;
  nodeSelection?: NodeSelection;
  nodes: NodeMap;
  targetMode: TargetModeState;
  setTargetMode: (state: TargetModeState) => void;
  alignmentModeEnabled: boolean;
  boxVisualiserEnabled: boolean;
}) {
  const instance = usePlugin(plugin);
  const hoveredNodes = useValue(instance.uiState.hoveredNodes);
  const hoveredNodeId = head(hoveredNodes);

  const hoveredNode = getNode(hoveredNodeId, nodes);
  //make sure to resolve the stale node
  const selectedNode = getNode(nodeSelection?.node.id, nodes);

  const selectedNodeGlobalOffset = getGlobalOffset(selectedNode?.id, nodes);
  const hoveredNodeGlobalOffset = getGlobalOffset(hoveredNodeId, nodes);
  const overlayCursor =
    targetMode.state === 'disabled' ? 'pointer' : 'crosshair';

  const onClickHoveredOverlay = () => {
    const selectedNode = getNode(hoveredNodeId, nodes);
    if (selectedNode != null) {
      instance.uiActions.onSelectNode(selectedNode, 'visualiser');
      instance.uiActions.ensureAncestorsExpanded(selectedNode.id);
    } else {
      instance.uiActions.onSelectNode(undefined, 'visualiser');
    }

    if (targetMode.state !== 'disabled') {
      setTargetMode({
        state: 'selected',
        targetedNodes: filterOutFalsy(
          hoveredNodes
            .slice()
            .reverse()
            .map((n) => getNode(n, nodes)),
        ),
        sliderPosition: hoveredNodes.length - 1,
      });
    }
  };

  return (
    <>
      {alignmentModeEnabled && selectedNode != null && (
        <AlignmentOverlay
          globalOffset={selectedNodeGlobalOffset}
          selectedNode={selectedNode}
          nodes={nodes}
          snapshotHeight={snapshotNode.bounds.height}
          snapshotWidth={snapshotNode.bounds.width}
        />
      )}

      {boxVisualiserEnabled && selectedNode != null && (
        <BoxModelOverlay
          selectedNode={selectedNode}
          globalOffset={selectedNodeGlobalOffset}
        />
      )}
      {hoveredNode != null && (
        <DelayedHoveredToolTip
          key={hoveredNode.id}
          node={hoveredNode}
          nodes={nodes}>
          <WireframeOverlay
            borderWidth={alignmentModeEnabled ? MediumBorder : ThickBorder}
            cursor={overlayCursor}
            onClick={onClickHoveredOverlay}
            globalOffset={hoveredNodeGlobalOffset}
            node={hoveredNode}
            type="hovered"
          />
        </DelayedHoveredToolTip>
      )}

      {selectedNode != null && (
        <WireframeOverlay
          node={selectedNode}
          globalOffset={selectedNodeGlobalOffset}
          borderWidth={
            alignmentModeEnabled || boxVisualiserEnabled
              ? ThinBorder
              : ThickBorder
          }
          cursor={overlayCursor}
          type="selected"
        />
      )}
    </>
  );
}

const ThickBorder = 3;
const MediumBorder = 2;
const ThinBorder = 1;
const longHoverDelay = 500;

const DelayedHoveredToolTip: React.FC<{
  node: ClientNode;
  nodes: Map<Id, ClientNode>;
  children: JSX.Element;
}> = ({node, children}) => {
  const isVisible = useDelay(longHoverDelay);

  return (
    <Tooltip
      open={isVisible}
      key={node.id}
      placement="top"
      zIndex={100}
      trigger={[]}
      title={node.name}
      align={{
        offset: [0, 7],
      }}>
      {children}
    </Tooltip>
  );
};

const marginColor = 'rgba(248, 51, 60, 0.75)';
const paddingColor = 'rgba(252, 171, 16, 0.75)';
const borderColor = 'rgba(68, 175, 105)';

const BoxModelOverlay: React.FC<{
  selectedNode: ClientNode;
  globalOffset: Coordinate;
}> = ({selectedNode, globalOffset}) => {
  const boxData = selectedNode.boxData;
  if (boxData == null) return null;

  return (
    <div
      style={{
        position: 'absolute',
        zIndex: 99,
        left: toPx(globalOffset.x),
        top: toPx(globalOffset.y),
        width: toPx(selectedNode.bounds.width),
        height: toPx(selectedNode.bounds.height),
      }}>
      <OuterBoxOverlay boxdata={boxData.margin} color={marginColor}>
        <InnerBoxOverlay boxdata={boxData.border} color={borderColor}>
          <InnerBoxOverlay boxdata={boxData.padding} color={paddingColor} />
        </InnerBoxOverlay>
      </OuterBoxOverlay>
    </div>
  );
};

/**
 * Draws outwards from parent to simulate margin
 */
const OuterBoxOverlay = styled.div<{
  boxdata: [number, number, number, number];
  color: string;
}>(({boxdata, color}) => {
  const [left, right, top, bottom] = boxdata;
  return {
    position: 'absolute',
    top: toPx(-top),
    bottom: toPx(-bottom),
    left: toPx(-left),
    right: toPx(-right),
    borderLeft: toPx(left),
    borderRightWidth: toPx(right),
    borderTopWidth: toPx(top),
    borderBottomWidth: toPx(bottom),
    borderStyle: 'solid',
    borderColor: color,
  };
});

/**
 * Draws inside parent to simulate border and padding
 */
const InnerBoxOverlay = styled.div<{
  boxdata: [number, number, number, number];
  color: string;
}>(({boxdata, color}) => {
  const [left, right, top, bottom] = boxdata;
  return {
    width: '100%',
    height: '100%',
    borderLeftWidth: toPx(left),
    borderRightWidth: toPx(right),
    borderTopWidth: toPx(top),
    borderBottomWidth: toPx(bottom),
    borderStyle: 'solid',
    borderColor: color,
  };
});

const alignmentOverlayBorder = `1px dashed ${theme.primaryColor}`;

const AlignmentOverlay: React.FC<{
  selectedNode: ClientNode;
  nodes: Map<Id, ClientNode>;
  snapshotWidth: number;
  snapshotHeight: number;
  globalOffset: Coordinate;
}> = ({selectedNode, snapshotHeight, snapshotWidth, globalOffset}) => {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          zIndex: 99,
          borderLeft: alignmentOverlayBorder,
          borderRight: alignmentOverlayBorder,
          width: toPx(selectedNode.bounds.width),
          height: toPx(snapshotHeight),
          left: toPx(globalOffset.x),
        }}
      />
      <div
        style={{
          position: 'absolute',
          zIndex: 99,
          borderTop: alignmentOverlayBorder,
          borderBottom: alignmentOverlayBorder,
          width: toPx(snapshotWidth),
          height: toPx(selectedNode.bounds.height),
          top: toPx(globalOffset.y),
        }}
      />
    </>
  );
};

/**
 * Used to indicate hovered and selected states
 */
const WireframeOverlay = styled.div<{
  borderWidth: number;
  cursor: 'pointer' | 'crosshair';
  type: 'selected' | 'hovered';
  node: ClientNode;
  globalOffset: Coordinate;
}>(({type, node, globalOffset, cursor, borderWidth}) => {
  return {
    zIndex: 100,
    pointerEvents: type === 'selected' ? 'none' : 'auto',
    cursor,
    position: 'absolute',
    top: toPx(globalOffset.y),
    left: toPx(globalOffset.x),
    width: toPx(node.bounds.width),
    height: toPx(node.bounds.height),
    boxSizing: 'border-box',
    borderWidth,
    borderStyle: 'solid',
    color: 'transparent',
    borderColor:
      type === 'selected' ? theme.primaryColor : theme.textColorPlaceholder,
  };
});

/**
 * computes the x,y offset of a given node from the root of the visualization
 * in node coordinates
 */
function getGlobalOffset(
  id: Id | undefined,
  nodes: Map<Id, ClientNode>,
): Coordinate {
  const offset = {x: 0, y: 0};
  let curId: Id | undefined = id;

  while (curId != null) {
    const cur = nodes.get(curId);
    if (cur != null) {
      offset.x += cur.bounds.x;
      offset.y += cur.bounds.y;
    }
    curId = cur?.parent;
  }

  return offset;
}
