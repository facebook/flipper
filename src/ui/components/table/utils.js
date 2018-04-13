/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 * @format
 */

export function normaliseColumnWidth(
  width: void | string | number,
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

export function isPercentage(width: mixed): boolean {
  return typeof width === 'string' && width[width.length - 1] === '%';
}
