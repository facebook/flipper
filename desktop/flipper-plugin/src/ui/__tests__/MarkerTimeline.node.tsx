/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {MarkerTimeline} from '../MarkerTimeline';

test('merges points with same timestamp', () => {
  const points = [
    {key: 'marker1', label: 'marker1', time: 41},
    {key: 'marker2', label: 'marker2', time: 41},
  ];

  const {timePoints} = MarkerTimeline.getDerivedStateFromProps({
    lineHeight: 22,
    maxGap: 100,
    points,
  });
  expect(timePoints[0].markerNames).toContain('marker1');
  expect(timePoints[0].markerNames).toContain('marker2');
});

test('sorts points', () => {
  const {timePoints} = MarkerTimeline.getDerivedStateFromProps({
    lineHeight: 22,
    maxGap: 100,
    points: [
      {key: 'marker1', label: 'marker1', time: 20},
      {key: 'marker2', label: 'marker2', time: -50},
    ],
  });
  expect(timePoints[0].timestamp).toBe(-50);
  expect(timePoints[1].timestamp).toBe(20);
});

test('handles negative timestamps', () => {
  const points = [{label: 'preStartPoint', key: 'preStartPoint', time: -50}];

  const {timePoints} = MarkerTimeline.getDerivedStateFromProps({
    lineHeight: 22,
    maxGap: 100,
    points,
  });
  expect(timePoints[0].timestamp).toBe(-50);
});

test('no points', () => {
  const {timePoints} = MarkerTimeline.getDerivedStateFromProps({
    lineHeight: 22,
    maxGap: 100,
    points: [],
  });
  expect(timePoints).toMatchSnapshot();
});

test('handles single point', () => {
  const points = [{key: '1', label: 'single point', time: 0}];

  const {timePoints} = MarkerTimeline.getDerivedStateFromProps({
    lineHeight: 22,
    maxGap: 100,
    points,
  });
  expect(timePoints).toMatchSnapshot();
});

test('cuts long gaps', () => {
  const points = [
    {key: '1', label: 'single point', time: 1},
    {key: '2', label: 'single point', time: 1000},
    {key: '3', label: 'single point', time: 1001},
  ];

  const MAX_GAP = 100;

  const {timePoints} = MarkerTimeline.getDerivedStateFromProps({
    lineHeight: 22,
    maxGap: MAX_GAP,
    points,
  });

  expect(timePoints[0].isCut).toBe(false);
  expect(timePoints[1].isCut).toBe(true);
  expect(timePoints[1].positionY).toBe(timePoints[0].positionY + MAX_GAP);
});
