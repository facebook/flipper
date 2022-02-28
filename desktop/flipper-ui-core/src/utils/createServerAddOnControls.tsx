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
  start: (pluginName, owner) =>
    flipperServer.exec('plugins-server-add-on-start', pluginName, owner),
  stop: (pluginName, owner) =>
    flipperServer.exec('plugins-server-add-on-stop', pluginName, owner),
});
