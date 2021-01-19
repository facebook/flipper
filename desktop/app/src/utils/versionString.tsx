/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import isProduction from '../utils/isProduction';
import {remote} from 'electron';
import config from '../fb-stubs/config';
import ReleaseChannel from '../ReleaseChannel';

const version = remote.app.getVersion();

export function getVersionString() {
  return (
    version +
    (isProduction() ? '' : '-dev') +
    (config.getReleaseChannel() !== ReleaseChannel.STABLE
      ? `-${config.getReleaseChannel()}`
      : '')
  );
}
