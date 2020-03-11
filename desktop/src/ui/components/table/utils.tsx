/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export function normaliseColumnWidth(
  width: string | number | null | undefined,
): number | string {
  if (width == null || width === 'flex') {
    // default
    return 'flex';
  }

  if (isPercentage(width)) {
    // percentage eg. 50%
    return width;
  }

  if (typeof width === 'number') {
    // pixel width
    return width;
  }

  throw new TypeError(`Unknown value ${width} for table column width`);
}

export function isPercentage(width: any): boolean {
  return typeof width === 'string' && width[width.length - 1] === '%';
}
