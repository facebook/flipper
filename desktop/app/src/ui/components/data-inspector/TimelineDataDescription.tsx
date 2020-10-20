/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import ManagedDataInspector from './ManagedDataInspector';
import {Component, ReactNode} from 'react';
import {colors} from '../colors';
import React from 'react';
import MarkerTimeline from '../MarkerTimeline';
import Button from '../Button';

type TimePoint = {
  moment: number;
  display: string;
  color: string;
  key: string;
  properties: {[key: string]: string};
};

type Timeline = {
  time: TimePoint[];
  current: string;
};

type Props = {
  canSetCurrent?: boolean;
  timeline: Timeline;
  onClick: (selected: string) => void;
};

type State = {
  selected: string;
};

export default class TimelineDataDescription extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {selected: props.timeline.current};
  }

  render(): ReactNode {
    const moments = Object.values(this.props.timeline.time);
    const firstMoment = moments[0].moment;
    const points = moments.map((value) => ({
      label: value.display,
      time: value.moment - firstMoment,
      color:
        Object.entries(colors).find(([k, _]) => k === value.color)?.[1] ??
        value.color,
      key: value.key,
    }));
    return (
      <>
        {this.props.canSetCurrent && (
          <div>
            <Button
              onClick={() => this.props.onClick(this.state.selected)}
              disabled={this.state.selected === this.props.timeline.current}>
              Set as current
            </Button>
          </div>
        )}
        <div>
          <MarkerTimeline
            points={points}
            onClick={(ids) => this.setState({selected: ids[0]})}
            maxGap={50}
            selected={this.state.selected}
          />
        </div>
        <div>
          <ManagedDataInspector
            data={
              this.props.timeline.time.find(
                (value) => value.key === this.state.selected,
              )?.properties ?? {}
            }
          />
        </div>
      </>
    );
  }
}
