/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperServer, ServerAddOnControls} from 'flipper-common';

export const createServerAddOnControls = (
  flipperServer: Pick<FlipperServer, 'exec'>,
): ServerAddOnControls => ({
  start: (pluginName) =>
    flipperServer.exec('plugins-server-add-on-start', pluginName),
  stop: (pluginName) =>
    flipperServer.exec('plugins-server-add-on-stop', pluginName),
});
