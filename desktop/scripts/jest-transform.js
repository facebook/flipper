/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

const isFB = require('./isFB');

if (isFB && process.env.FLIPPER_FB === undefined) {
  process.env.FLIPPER_FB = 'true';
}
process.env.FLIPPER_TEST_RUNNER = 'true';

// eslint-disable-next-line import/no-unresolved,flipper/no-relative-imports-across-packages
const {transform} = require('../babel-transformer/lib/transform-jest');

module.exports = {
  process(src, filename, options) {
    return transform({
      src,
      filename,
      options: {...options, isTestRunner: true},
    });
  },
};
