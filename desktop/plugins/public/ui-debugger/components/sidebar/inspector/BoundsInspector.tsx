/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Bounds} from '../../../types';
import {InspectorStyle} from './Styles';

type Props = {
  size?: number;
  strokeColor?: string;
  outerBoxColor?: string;
  innerBoxColor?: string;
  multiplier?: number;
  margin?: number;
  separator?: number;
  value: Bounds;
};

const BoundsInspector: React.FC<Props> = ({
  size = InspectorStyle.bounds.size,
  strokeColor = InspectorStyle.strokeColor,
  outerBoxColor = InspectorStyle.outerFillColor,
  innerBoxColor = InspectorStyle.innerFillColor,
  multiplier = InspectorStyle.bounds.multiplier,
  margin = InspectorStyle.bounds.margin,
  separator = InspectorStyle.bounds.separator,
  value,
}) => {
  const scale =
    Math.min(size / (value.width + value.x), size / (value.height + value.y)) *
    multiplier;

  const width = value.width * scale;
  const height = value.height * scale;

  const origin = size / 2;
  const originX = origin - width / 2;
  const originY = origin - height / 2;

  const midX = originX + width / 2;
  const midY = originY + height / 2;

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
        width={width}
        height={height}
        x={originX}
        y={originY}
        fill={innerBoxColor}
      />{' '}
      {/** bounded-box */}
      <circle cx={originX} cy={midY} r="2" fill={strokeColor} /> {/** left */}
      <circle cx={midX} cy={originY} r="2" fill={strokeColor} /> {/** top */}
      <circle
        cx={originX}
        cy={originY + height}
        r="2"
        fill={strokeColor}
      />{' '}
      {/** left-bottom */}
      <circle cx={originX + width} cy={originY} r="2" fill={strokeColor} />{' '}
      {/** right-top */}
      <circle
        cx={originX + width}
        cy={originY + height}
        r="2"
        fill={strokeColor}
      />{' '}
      {/** right-bottom */}
      <text
        x={0}
        y={midY}
        dominantBaseline="middle"
        textAnchor="right"
        fill={strokeColor}>
        {value.x}
      </text>
      {/** x */}
      <line
        x1={separator * 2}
        y1={midY}
        x2={originX - separator}
        y2={midY}
        style={lineStyle}
        strokeDasharray="2,2"
      />
      {/** left */}
      <line
        x1={separator * 2}
        y1={midY - margin}
        x2={separator * 2}
        y2={midY + margin}
        style={lineStyle}
      />
      {/** bezel */}
      <line
        x1={originX - separator}
        y1={midY - margin}
        x2={originX - separator}
        y2={midY + margin}
        style={lineStyle}
      />
      {/** bezel */}
      <text
        x={midX}
        y={originY + height + separator * 2}
        dominantBaseline="middle"
        textAnchor="middle"
        fill={strokeColor}>
        {value.width}
      </text>
      {/** width */}
      <line
        x1={originX}
        y1={originY + height + separator}
        x2={originX + width}
        y2={originY + height + separator}
        style={lineStyle}
        strokeDasharray="2,2"
      />
      {/** bottom */}
      <line
        x1={originX}
        y1={originY + height + separator - margin}
        x2={originX}
        y2={originY + height + separator + margin}
        style={lineStyle}
      />
      {/** bezel */}
      <line
        x1={originX + width}
        y1={originY + height + separator - margin}
        x2={originX + width}
        y2={originY + height + separator + margin}
        style={lineStyle}
      />
      {/** bezel */}
      <text
        x={midX}
        y={separator}
        dominantBaseline="middle"
        textAnchor="middle"
        fill={strokeColor}>
        {value.y}
      </text>
      {/** y */}
      <line
        x1={midX}
        y1={separator * 2}
        x2={midX}
        y2={originY - separator}
        style={lineStyle}
        strokeDasharray="2,2"
      />
      {/** top */}
      <line
        x1={midX - margin}
        y1={separator * 2}
        x2={midX + margin}
        y2={separator * 2}
        style={lineStyle}
      />
      {/** bezel */}
      <line
        x1={midX - margin}
        y1={originY - separator}
        x2={midX + margin}
        y2={originY - separator}
        style={lineStyle}
      />
      {/** bezel */}
      <text
        x={originX + width + separator * 3}
        y={midY}
        dominantBaseline="middle"
        textAnchor="middle"
        fill={strokeColor}>
        {value.height}
      </text>
      {/** height */}
      <line
        x1={originX + width + separator}
        y1={originY}
        x2={originX + width + separator}
        y2={originY + height}
        style={lineStyle}
        strokeDasharray="2,2"
      />
      {/** right */}
      <line
        x1={originX + width + separator - margin}
        y1={originY}
        x2={originX + width + separator + margin}
        y2={originY}
        style={lineStyle}
      />
      {/** bezel */}
      <line
        x1={originX + width + separator - margin}
        y1={originY + height}
        x2={originX + width + separator + margin}
        y2={originY + height}
        style={lineStyle}
      />
      {/** bezel */}
    </svg>
  );
};

export default BoundsInspector;
