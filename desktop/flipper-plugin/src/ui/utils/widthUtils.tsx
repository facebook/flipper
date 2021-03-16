/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export type Percentage = string; // currently broken, see https://github.com/microsoft/TypeScript/issues/41651. Should be `${number}%`;

export type Width = undefined | number | Percentage; // undefined represents auto flex

export function isPercentage(width: any): width is Percentage {
  return typeof width === 'string' && width[width.length - 1] === '%';
}

export function calculatePercentage(
  parentWidth: number,
  selfWidth: number,
): Percentage {
  return `${(100 / parentWidth) * selfWidth}%` as const;
}
