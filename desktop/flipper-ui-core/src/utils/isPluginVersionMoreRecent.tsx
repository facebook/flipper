/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {ConcretePluginDetails} from 'flipper-plugin-lib';
import semver from 'semver';
import isPluginCompatible from './isPluginCompatible';

export function isPluginVersionMoreRecent(
  versionDetails: ConcretePluginDetails,
  otherVersionDetails: ConcretePluginDetails,
) {
  const isPlugin1Compatible = isPluginCompatible(versionDetails);
  const isPlugin2Compatible = isPluginCompatible(otherVersionDetails);

  // prefer compatible plugins
  if (isPlugin1Compatible && !isPlugin2Compatible) return true;
  if (!isPlugin1Compatible && isPlugin2Compatible) return false;

  // prefer plugins with greater version
  if (semver.gt(versionDetails.version, otherVersionDetails.version)) {
    return true;
  }
  if (
    semver.eq(versionDetails.version, otherVersionDetails.version) &&
    versionDetails.isBundled
  ) {
    // prefer bundled versions
    return true;
  }
  if (
    semver.eq(versionDetails.version, otherVersionDetails.version) &&
    versionDetails.isActivatable &&
    !otherVersionDetails.isActivatable
  ) {
    // prefer locally available versions to the versions available remotely on marketplace
    return true;
  }
  return false;
}

export default isPluginVersionMoreRecent;
