/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {Component} from 'react';
import styled from '../styled/index.js';
import Text from './Text.js';
import FlexRow from './FlexRow.js';
import {colors} from './colors.js';

type DataPoint = {
  time: number,
  color?: string,
  label: string,
  key: string,
};

type Props = {|
  onClick?: (keys: Array<string>) => mixed,
  selected?: ?string,
  points: Array<DataPoint>,
  lineHeight: number,
  maxGap: number,
|};

const Markers = styled('div')(props => ({
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

const Point = styled(FlexRow)(props => ({
  position: 'absolute',
  top: props.positionY,
  left: 0,
  right: 10,
  cursor: props.onClick ? 'pointer' : 'default',
  borderRadius: 3,
  alignItems: 'center',
  ':hover': {
    background: props.onClick ? colors.light02 : 'transparent',
  },
  '::before': {
    position: 'relative',
    textAlign: 'center',
    fontSize: 8,
    fontWeight: '500',
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
    boxShadow: props.selected
      ? `0 0 0 2px ${colors.macOSTitleBarIconSelected}`
      : null,
  },
  '::after': {
    content: props.cut ? '""' : null,
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

const Time = styled('span')({
  color: colors.light30,
  fontWeight: '300',
  marginRight: 4,
});

const Code = styled(Text)({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

type TimePoint = {
  timestamp: number,
  markerNames: Array<string>,
  markerKeys: Array<string>,
  isCut: boolean,
  positionY: number,
  color: string,
};

type State = {|
  timePoints: Array<TimePoint>,
|};

export default class MarkerTimeline extends Component<Props, State> {
  static defaultProps = {
    lineHeight: 22,
    maxGap: 100,
  };

  static getDerivedStateFromProps(props: Props) {
    const sortedMarkers: Array<[number, Array<DataPoint>]> = Array.from(
      props.points
        .reduce((acc: Map<number, Array<DataPoint>>, cv: DataPoint) => {
          const list = acc.get(cv.time);
          if (list) {
            list.push(cv);
          } else {
            acc.set(cv.time, [cv]);
          }
          return acc;
        }, (new Map(): Map<number, Array<DataPoint>>))
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
              title={p.markerNames.length > 1 ? p.markerNames.join(', ') : null}
              positionY={p.positionY}
              onClick={onClick ? () => onClick(p.markerKeys) : undefined}
              selected={p.markerKeys.includes(this.props.selected)}
              number={p.markerNames.length > 1 ? p.markerNames.length : null}>
              <Time>{p.timestamp}ms</Time>{' '}
              <Code code>{p.markerNames.join(', ')}</Code>
            </Point>
          );
        })}
      </Markers>
    );
  }
}
