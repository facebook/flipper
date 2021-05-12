/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {PluginDetails} from 'flipper-plugin-lib';
import semver from 'semver';
import GK from '../fb-stubs/GK';
import {getAppVersion} from './info';

export function isPluginCompatible(plugin: PluginDetails) {
  const flipperVersion = getAppVersion();
  return (
    GK.get('flipper_disable_plugin_compatibility_checks') ||
    flipperVersion === '0.0.0' ||
    !plugin.engines?.flipper ||
    semver.lte(plugin.engines?.flipper, flipperVersion)
  );
}

export default isPluginCompatible;
