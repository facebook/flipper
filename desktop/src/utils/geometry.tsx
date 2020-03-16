/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export type Rect = {
  top: number;
  left: number;
  height: number;
  width: number;
};

export function isOverlappedRect(a: Rect, b: Rect): boolean {
  const aRight = a.left + a.width;
  const bRight = b.left + b.width;
  const aBottom = a.top + a.height;
  const bBottom = b.top + b.height;
  return (
    a.left < bRight && b.left < aRight && a.top < bBottom && b.top < aBottom
  );
}

export function getDistanceRect(a: Rect, b: Rect): number {
  const mostLeft = a.left < b.left ? a : b;
  const mostRight = b.left < a.left ? a : b;

  let xDifference =
    mostLeft.left === mostRight.left
      ? 0
      : mostRight.left - (mostLeft.left + mostLeft.width);
  xDifference = Math.max(0, xDifference);

  const upper = a.top < b.top ? a : b;
  const lower = b.top < a.top ? a : b;

  let yDifference =
    upper.top === lower.top ? 0 : lower.top - (upper.top + upper.height);
  yDifference = Math.max(0, yDifference);

  return Math.min(xDifference, yDifference);
}
