/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import ReactDOM from 'react-dom';
import {ElementsInspectorElement} from 'flipper-plugin';
import styled from '@emotion/styled';

export function VisualizerPortal(props: {
  container: HTMLElement;
  highlightedElement: string | null;
  elements: {[key: string]: ElementsInspectorElement};
  screenshotURL: string;
  screenDimensions: {width: number; height: number};
}) {
  props.container.style.margin = '0';
  const element: ElementsInspectorElement | null | '' =
    props.highlightedElement && props.elements[props.highlightedElement];

  const position =
    element &&
    typeof element.data.View?.positionOnScreenX == 'number' &&
    typeof element.data.View?.positionOnScreenY == 'number' &&
    typeof element.data.View.width === 'object' &&
    element.data.View.width.value != null &&
    typeof element.data.View.height === 'object' &&
    element.data.View.height.value != null
      ? {
          x: element.data.View.positionOnScreenX,
          y: element.data.View.positionOnScreenY,
          width: element.data.View.width.value,
          height: element.data.View.height.value,
        }
      : null;

  return ReactDOM.createPortal(
    <Visualizer
      screenDimensions={props.screenDimensions}
      element={position}
      imageURL={props.screenshotURL}
    />,
    props.container,
  );
}

const VisualizerContainer = styled.div({
  position: 'relative',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  userSelect: 'none',
});

const DeviceImage = styled.img<{
  width?: number | string;
  height?: number | string;
}>(({width, height}) => ({
  width,
  height,
  userSelect: 'none',
}));

/**
 * Component that displays a static picture of a device
 * and renders "highlighted" rectangles over arbitrary points on it.
 * Used for emulating the layout plugin when a device isn't connected.
 */
function Visualizer(props: {
  screenDimensions: {width: number; height: number};
  element: {x: number; y: number; width: number; height: number} | null;
  imageURL: string;
}) {
  const containerRef: React.Ref<HTMLDivElement> = React.createRef();
  const imageRef: React.Ref<HTMLImageElement> = React.createRef();
  let w: number = 0;
  let h: number = 0;
  const [scale, updateScale] = React.useState(1);

  React.useLayoutEffect(() => {
    w = containerRef.current?.offsetWidth || 0;
    h = containerRef.current?.offsetHeight || 0;
    const xScale = props.screenDimensions.width / w;
    const yScale = props.screenDimensions.height / h;
    updateScale(Math.max(xScale, yScale));
    imageRef.current?.setAttribute('draggable', 'false');
  });
  return (
    <VisualizerContainer ref={containerRef}>
      <DeviceImage
        ref={imageRef}
        src={props.imageURL}
        width={props.screenDimensions.width / scale}
        height={props.screenDimensions.height / scale}
      />
      {props.element && (
        <div
          style={{
            position: 'absolute',
            left: props.element.x / scale,
            top: props.element.y / scale,
            width: props.element.width / scale,
            height: props.element.height / scale,
            backgroundColor: '#637dff',
            opacity: 0.7,
            userSelect: 'none',
          }}></div>
      )}
    </VisualizerContainer>
  );
}
