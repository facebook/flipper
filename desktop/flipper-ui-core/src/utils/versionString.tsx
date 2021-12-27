/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import isProduction from '../utils/isProduction';
import {getAppVersion} from './info';
import config from '../fb-stubs/config';
import {ReleaseChannel} from 'flipper-common';

export function getVersionString() {
  return (
    getAppVersion() +
    (isProduction() ? '' : '-dev') +
    (config.getReleaseChannel() !== ReleaseChannel.STABLE
      ? `-${config.getReleaseChannel()}`
      : '')
  );
}
