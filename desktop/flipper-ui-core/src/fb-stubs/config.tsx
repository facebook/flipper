/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import ReleaseChannel from '../ReleaseChannel';

export default {
  updateServer: 'https://www.facebook.com/fbflipper/public/latest.json',
  showLogin: false,
  showFlipperRating: false,
  warnFBEmployees: true,
  isFBBuild: false,
  getReleaseChannel: () => ReleaseChannel.STABLE,
};
