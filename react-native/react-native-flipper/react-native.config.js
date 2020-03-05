/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

module.exports = {
  dependency: {
    platforms: {
      ios: {
        // This file should not be needed at all, but without it.
        // cli 4.2.2 will search for an xcode project
        project: '.',
      },
    },
  },
};
