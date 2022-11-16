/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {SpaceBox} from '../../../types';
import {InspectorStyle} from './Styles';

type Props = {
  size?: number;
  strokeColor?: string;
  outerBoxColor?: string;
  innerBoxColor?: string;
  margin?: number;
  separator?: number;
  value: SpaceBox;
};

const SpaceBoxInspector: React.FC<Props> = ({
  size = InspectorStyle.spaceBox.size,
  strokeColor = InspectorStyle.strokeColor,
  outerBoxColor = InspectorStyle.outerFillColor,
  innerBoxColor = InspectorStyle.innerFillColor,
  margin = InspectorStyle.spaceBox.margin,
  separator = InspectorStyle.spaceBox.separator,
  value,
}) => {
  const half = size / 2;
  const quarter = size / 4;
  const radius = 2;

  const lineStyle = {stroke: strokeColor, strokeWidth: '2'};
  return (
    <svg
      width={size}
      height={size}
      style={{border: '1', borderColor: innerBoxColor, borderStyle: 'solid'}}
      viewBox={'0 0 ' + size + ' ' + size}
      xmlns="http://www.w3.org/2000/svg">
      <rect width={size} height={size} x={0} y={0} fill={outerBoxColor} />{' '}
      {/** outer-box */}
      <rect
        width={half}
        height={half}
        x={quarter}
        y={quarter}
        fill={innerBoxColor}
      />{' '}
      {/** inner-box */}
      <circle cx={quarter} cy={half} r={radius} fill={strokeColor} />
      {/** left */}
      <circle cx={half} cy={quarter} r={radius} fill={strokeColor} />
      {/** top */}
      <circle cx={half} cy={half + quarter} r={radius} fill={strokeColor} />
      {/** bottom */}
      <circle cx={half + quarter} cy={half} r={radius} fill={strokeColor} />
      {/** right */}
      {/** left-inner */}
      <line
        x1={quarter + margin}
        y1={half}
        x2={half - margin}
        y2={half}
        style={lineStyle}
      />
      {/** straight-line  */}
      <line
        x1={quarter + margin}
        y1={half - separator}
        x2={quarter + margin}
        y2={half + separator}
        style={lineStyle}
      />
      {/** left-separator */}
      <line
        x1={half - margin}
        y1={half - separator}
        x2={half - margin}
        y2={half + separator}
        style={lineStyle}
      />
      {/** right-separator */}
      {/** right-inner */}
      <line
        x1={half + margin}
        y1={half}
        x2={half + quarter - margin}
        y2={half}
        style={lineStyle}
      />
      {/** straight-line */}
      <line
        x1={half + margin}
        y1={half - separator}
        x2={half + margin}
        y2={half + separator}
        style={lineStyle}
      />
      {/** left-separator */}
      <line
        x1={half + quarter - margin}
        y1={half - separator}
        x2={half + quarter - margin}
        y2={half + separator}
        style={lineStyle}
      />
      {/** right-separator */}
      {/** top-inner */}
      <line
        x1={half}
        y1={quarter + margin}
        x2={half}
        y2={half - margin}
        style={lineStyle}
      />
      {/** straight-line */}
      <line
        x1={half - separator}
        y1={quarter + margin}
        x2={half + separator}
        y2={quarter + margin}
        style={lineStyle}
      />
      {/** left-separator */}
      <line
        x1={half - separator}
        y1={half - margin}
        x2={half + separator}
        y2={half - margin}
        style={lineStyle}
      />
      {/** right-separator */}
      {/** bottom-inner */}
      <line
        x1={half}
        y1={half + margin}
        x2={half}
        y2={half + quarter - margin}
        style={lineStyle}
      />
      {/** straight-line */}
      <line
        x1={half - separator}
        y1={half + margin}
        x2={half + separator}
        y2={half + margin}
        style={lineStyle}
      />
      {/** left-separator */}
      <line
        x1={half - separator}
        y1={half + quarter - margin}
        x2={half + separator}
        y2={half + quarter - margin}
        style={lineStyle}
      />
      {/** right-separator */}
      <text
        x={half}
        y={quarter - quarter / 2}
        dominantBaseline="middle"
        textAnchor="middle"
        fill={strokeColor}>
        {value.top}
      </text>
      {/** top */}
      <text
        x={half}
        y={size - quarter / 2}
        dominantBaseline="middle"
        textAnchor="middle"
        fill={strokeColor}>
        {value.bottom}
      </text>
      {/** bottom */}
      <text
        x={quarter - quarter / 2}
        y={half}
        dominantBaseline="middle"
        textAnchor="middle"
        fill={strokeColor}>
        {value.left}
      </text>
      {/** left */}
      <text
        x={size - quarter / 2}
        y={half}
        dominantBaseline="middle"
        textAnchor="middle"
        fill={strokeColor}>
        {value.right}
      </text>
      {/** right */}
    </svg>
  );
};

export default SpaceBoxInspector;
