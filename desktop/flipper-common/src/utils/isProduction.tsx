/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

declare const process: any;

// TODO: there are currently two definitions of isProduction active,
// this one, and one provided by the RenderHostConfig. Ideally they should be unified
export function isProduction(): boolean {
  return (
    typeof process === 'undefined' ||
    (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test')
  );
}
