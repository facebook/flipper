/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// we need to use this plugin to be able to symlink plugin docs to "docs" folder
module.exports = function(context, options) {
    return {
      name: "support-symlinks",
      configureWebpack(config, isServer, utils) {
        return {
          resolve: {
            symlinks: false
          },
          devServer: {
            watchOptions: { followSymlinks: false }
          }
        };
      }
    };
  };
