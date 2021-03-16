/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import LowPassFilter from '../../utils/LowPassFilter';

test('hasFullBuffer', () => {
  const lpf = new LowPassFilter();
  expect(lpf.hasFullBuffer()).toBeFalsy();

  lpf.push(1);
  lpf.push(2);
  lpf.push(3);
  lpf.push(4);
  lpf.push(5);

  expect(lpf.hasFullBuffer()).toBeTruthy();
});

test('push on full buffer returns shifted value', () => {
  const lpf = new LowPassFilter();
  expect(lpf.push(1)).toBe(0);
  expect(lpf.push(2)).toBe(0);
  expect(lpf.push(3)).toBe(0);
  expect(lpf.push(4)).toBe(0);
  expect(lpf.push(5)).toBe(0);
  expect(lpf.push(6)).toBe(1);
  expect(lpf.push(7)).toBe(2);
});

test('next returns smoothed value', () => {
  const lpf = new LowPassFilter();
  expect(lpf.next(1)).toBe(0.9);
  expect(lpf.next(2)).toBe(1.881);
});

test('next returns smoothed value with custom smoothing', () => {
  const lpf = new LowPassFilter(0.5);
  expect(lpf.next(1)).toBe(0.5);
  expect(lpf.next(2)).toBe(1.125);
});
