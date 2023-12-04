/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {getFlipperServerConfig} from '../flipperServer';

export function GK(gatekeeper: string) {
  return getFlipperServerConfig().gatekeepers[gatekeeper] ?? false;
}
