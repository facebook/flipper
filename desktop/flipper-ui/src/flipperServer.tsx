/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperServer, FlipperServerConfig} from 'flipper-common';

let flipperServer: FlipperServer;

export function getFlipperServer() {
  return flipperServer;
}

export function setFlipperServer(newFlipperServer: FlipperServer) {
  flipperServer = newFlipperServer;
}

let flipperServerConfig: FlipperServerConfig;
export function getFlipperServerConfig() {
  return flipperServerConfig;
}
export function setFlipperServerConfig(
  newFlipperServerConfig: FlipperServerConfig,
) {
  flipperServerConfig = newFlipperServerConfig;
}
