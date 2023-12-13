/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {PluginDetails} from 'flipper-common';
import semver from 'semver';
import {GK} from './GK';
import {getAppVersion} from './info';

export function isPluginCompatible(plugin: PluginDetails) {
  const flipperVersion = getAppVersion();
  return (
    GK('flipper_disable_plugin_compatibility_checks') ||
    flipperVersion === '0.0.0' ||
    !plugin.engines?.flipper ||
    semver.lte(plugin.engines?.flipper, flipperVersion)
  );
}

export default isPluginCompatible;
