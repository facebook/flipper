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
//  Special subset of flipper-plugin exports designed for server-side usage
// eslint-disable-next-line no-restricted-imports
import * as FlipperPluginSDK from 'flipper-plugin/src/server';

declare global {
  // eslint-disable-next-line no-var
  var FlipperPlugin: typeof FlipperPluginSDK;
}
global.FlipperPlugin = FlipperPluginSDK;

// defaultPlugins has to be required after we set FlipperPlugin.
// In server add-ons, developers might import utilities from 'flipper-plugin'
// In babel-transformer/plugin-flipper-requires flipper-plugin is replaces with global.FlipperPlugin.
// If defaultPlugins is required before we set global.FlipperPlugin,
// then flipper-plugin replaced with global.FlipperPlugin is evaluated in server add-ons before we set it - to undefined.
//
// The file is generated automatically by "prepareDefaultPlugins" in "scripts"
const defaultPlugins = require('../defaultPlugins').default;

interface ServerAddOnModule {
  default: ServerAddOnFn<any, any>;
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
