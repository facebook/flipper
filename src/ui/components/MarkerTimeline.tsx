/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Component} from 'react';
import styled from '@emotion/styled';
import Text from './Text';
import FlexRow from './FlexRow';
import {colors} from './colors';
import React from 'react';

type DataPoint = {
  time: number;
  color?: string;
  label: string;
  key: string;
};

type Props = {
  onClick?: (keys: Array<string>) => void;
  selected?: string | null | undefined;
  points: DataPoint[];
  lineHeight: number;
  maxGap: number;
};

type MouseEventHandler = (
  event: React.MouseEvent<HTMLDivElement, MouseEvent>,
) => void;

const Markers = styled.div<{totalTime: number}>(props => ({
  position: 'relative',
  margin: 10,
  height: props.totalTime,
  '::before': {
    content: '""',
    width: 1,
    borderLeft: `1px dotted ${colors.light30}`,
    position: 'absolute',
    top: 5,
    bottom: 20,
    left: 5,
  },
}));
Markers.displayName = 'MarkerTimeline:Markers';

const Point = styled(FlexRow)<{
  positionY: number;
  onClick: MouseEventHandler | undefined;
  number: number | undefined;
  threadColor: string;
  selected: boolean;
  cut: boolean;
}>(props => ({
  position: 'absolute',
  top: props.positionY,
  left: 0,
  right: 10,
  cursor: props.onClick ? 'pointer' : 'default',
  borderRadius: 3,
  alignItems: 'flex-start',
  lineHeight: '16px',
  ':hover': {
    background: `linear-gradient(to top, rgba(255,255,255,0) 0, #ffffff 10px)`,
    paddingBottom: 5,
    zIndex: 2,
    '> span': {
      whiteSpace: 'initial',
    },
  },
  '::before': {
    position: 'relative',
    textAlign: 'center',
    fontSize: 8,
    fontWeight: 500,
    content: props.number ? `'${props.number}'` : '""',
    display: 'inline-block',
    width: 9,
    height: 9,
    flexShrink: 0,
    color: 'rgba(0,0,0,0.4)',
    lineHeight: '9px',
    borderRadius: '999em',
    border: '1px solid rgba(0,0,0,0.2)',
    backgroundColor: props.threadColor,
    marginRight: 6,
    zIndex: 3,
    boxShadow: props.selected
      ? `0 0 0 2px ${colors.macOSTitleBarIconSelected}`
      : undefined,
  },
  '::after': {
    content: props.cut ? '""' : undefined,
    position: 'absolute',
    width: 11,
    top: -20,
    left: 0,
    height: 2,
    background: colors.white,
    borderTop: `1px solid ${colors.light30}`,
    borderBottom: `1px solid ${colors.light30}`,
    transform: `skewY(-10deg)`,
  },
}));
Point.displayName = 'MakerTimeline:Point';

const Time = styled.span({
  color: colors.light30,
  fontWeight: 300,
  marginRight: 4,
  marginTop: -2,
});
Time.displayName = 'MakerTimeline:Time';

const Code = styled(Text)({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  marginTop: -1,
});
Code.displayName = 'MakerTimeline:Code';

type TimePoint = {
  timestamp: number;
  markerNames: Array<string>;
  markerKeys: Array<string>;
  isCut: boolean;
  positionY: number;
  color: string;
};

type State = {
  timePoints: Array<TimePoint>;
};

export default class MarkerTimeline extends Component<Props, State> {
  static defaultProps = {
    lineHeight: 22,
    maxGap: 100,
  };

  static getDerivedStateFromProps(props: Props) {
    const sortedMarkers: [number, DataPoint[]][] = Array.from(
      props.points
        .reduce((acc: Map<number, DataPoint[]>, cv: DataPoint) => {
          const list = acc.get(cv.time);
          if (list) {
            list.push(cv);
          } else {
            acc.set(cv.time, [cv]);
          }
          return acc;
        }, new Map())
        .entries(),
    ).sort((a, b) => a[0] - b[0]);

    const smallestGap = sortedMarkers.reduce((acc, cv, i, arr) => {
      if (i > 0) {
        return Math.min(acc, cv[0] - arr[i - 1][0]);
      } else {
        return acc;
      }
    }, Infinity);

    let positionY = 0;
    const timePoints: Array<TimePoint> = [];

    for (let i = 0; i < sortedMarkers.length; i++) {
      const [timestamp, points] = sortedMarkers[i];
      let isCut = false;
      const color = sortedMarkers[i][1][0].color || colors.white;

      if (i > 0) {
        const relativeTimestamp = timestamp - sortedMarkers[i - 1][0];
        const gap = (relativeTimestamp / smallestGap) * props.lineHeight;
        if (gap > props.maxGap) {
          positionY += props.maxGap;
          isCut = true;
        } else {
          positionY += gap;
        }
      }

      timePoints.push({
        timestamp,
        markerNames: points.map(p => p.label),
        markerKeys: points.map(p => p.key),
        positionY,
        isCut,
        color,
      });
    }

    return {timePoints};
  }

  state: State = {
    timePoints: [],
  };

  render() {
    const {timePoints} = this.state;
    const {onClick} = this.props;

    if (!this.props.points || this.props.points.length === 0) {
      return null;
    }

    return (
      <Markers
        totalTime={
          timePoints[timePoints.length - 1].positionY + this.props.lineHeight
        }>
        {timePoints.map((p: TimePoint, i: number) => {
          return (
            <Point
              key={i}
              threadColor={p.color}
              cut={p.isCut}
              positionY={p.positionY}
              onClick={onClick ? () => onClick(p.markerKeys) : undefined}
              selected={
                this.props.selected
                  ? p.markerKeys.includes(this.props.selected)
                  : false
              }
              number={
                p.markerNames.length > 1 ? p.markerNames.length : undefined
              }>
              <Time>{p.timestamp}ms</Time>{' '}
              <Code code>{p.markerNames.join(', ')}</Code>
            </Point>
          );
        })}
      </Markers>
    );
  }
}
