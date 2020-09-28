/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Rect} from './geometry';

export const SNAP_SIZE = 16;

export function snapGrid(val: number): number {
  return val - (val % SNAP_SIZE);
}

export function getPossibleSnappedPosition(
  windows: Array<Rect>,
  {
    getGap,
    getNew,
  }: {
    getNew: (win: Rect) => number;
    getGap: (win: Rect) => number;
  },
): number | undefined {
  for (const win of windows) {
    const gap = Math.abs(getGap(win));
    if (gap >= 0 && gap < SNAP_SIZE) {
      return getNew(win);
    }
  }
}

export function getDistanceTo(props: Rect, win: Rect): number {
  const x1 = win.left;
  const y1 = win.top;
  const x1b = win.left + win.width;
  const y1b = win.top + win.height;

  const x2 = props.left;
  const y2 = props.top;
  const x2b = props.left + props.width;
  const y2b = props.top + props.height;

  const left = x2b < x1;
  const right = x1b < x2;
  const bottom = y2b < y1;
  const top = y1b < y2;

  if (top && left) {
    return distance(x1, y1b, x2b, y2);
  } else if (left && bottom) {
    return distance(x1, y1, x2b, y2b);
  } else if (bottom && right) {
    return distance(x1b, y1, x2, y2b);
  } else if (right && top) {
    return distance(x1b, y1b, x2, y2);
  } else if (left) {
    return x1 - x2b;
  } else if (right) {
    return x2 - x1b;
  } else if (bottom) {
    return y1 - y2b;
  } else if (top) {
    return y2 - y1b;
  } else {
    return 0;
  }
}

export function distance(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

export function maybeSnapLeft(
  props: Rect,
  windows: Array<Rect>,
  left: number,
): number {
  // snap right side to left
  // ┌─┬─┐
  // │A│B│
  // └─┴─┘
  const snapRight = getPossibleSnappedPosition(windows, {
    getGap: (win) => win.left - (props.width + left),
    getNew: (win) => win.left - props.width,
  });
  if (snapRight != null) {
    return snapRight;
  }

  // snap left side to right
  // ┌─┬─┐
  // │B│A│
  // └─┴─┘
  const snapLeft = getPossibleSnappedPosition(windows, {
    getGap: (win) => left - (win.left + win.width),
    getNew: (win) => win.left + win.width,
  });
  if (snapLeft != null) {
    return snapLeft;
  }

  return snapGrid(left);
}

export function maybeSnapTop(
  _props: Rect,
  windows: Array<Rect>,
  top: number,
): number {
  // snap bottom to bottom
  // ┌─┐
  // │A├─┐
  // │ │B│
  // └─┴─┘
  const snapBottom2 = getPossibleSnappedPosition(windows, {
    getGap: (win) => top - win.top - win.height,
    getNew: (win) => win.top + win.height,
  });
  if (snapBottom2 != null) {
    return snapBottom2;
  }

  // snap top to bottom
  // ┌─┐
  // │B│
  // ├─┤
  // │A│
  // └─┘
  const snapBottom = getPossibleSnappedPosition(windows, {
    getGap: (win) => top - win.top - win.height,
    getNew: (win) => win.top + win.height,
  });
  if (snapBottom != null) {
    return snapBottom;
  }

  // snap top to top
  // ┌─┬─┐
  // │A│B│
  // │ ├─┘
  // └─┘
  const snapTop = getPossibleSnappedPosition(windows, {
    getGap: (win) => top - win.top,
    getNew: (win) => win.top,
  });
  if (snapTop != null) {
    return snapTop;
  }

  return snapGrid(top);
}
