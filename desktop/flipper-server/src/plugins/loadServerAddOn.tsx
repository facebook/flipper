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
import {assertNotNull} from '../app-connectivity/Utilities';

interface ServerAddOnModule {
  default: ServerAddOnFn<any, any>;
}

export const loadServerAddOn = (
  pluginName: string,
  details: ServerAddOnStartDetails,
): ServerAddOnModule => {
  console.debug('loadPlugin', pluginName, details);

  assertNotNull(
    details.path,
    `loadPlugin -> server add-on path is empty plugin ${pluginName}.`,
  );

  const serverAddOnModule = require(details.path);
  return serverAddOnModule;
};
