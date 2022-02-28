/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  ServerAddOn as ServerAddOnFn,
  ServerAddOnStartDetails,
} from 'flipper-common';
import {assertNotNull} from '../comms/Utilities';
// The file is generated automatically by "prepareDefaultPlugins" in "scripts"
// @ts-ignore
import defaultPlugins from '../defaultPlugins';

interface ServerAddOnModule {
  default: ServerAddOnFn;
}

export const loadServerAddOn = (
  pluginName: string,
  details: ServerAddOnStartDetails,
): ServerAddOnModule => {
  console.debug('loadPlugin', pluginName, details);

  if (details.isBundled) {
    const bundledPlugin = defaultPlugins[pluginName];
    assertNotNull(
      bundledPlugin,
      `loadPlugin (isBundled = true) -> plugin ${pluginName} not found.`,
    );
    return bundledPlugin;
  }

  assertNotNull(
    details.path,
    `loadPlugin (isBundled = false) -> server add-on path is empty plugin ${pluginName}.`,
  );

  // eslint-disable-next-line no-eval
  const serverAddOnModule = eval(`require("${details.path}")`);
  return serverAddOnModule;
};
