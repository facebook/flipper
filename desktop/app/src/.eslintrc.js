/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

module.exports = {
  rules: {
    'no-restricted-imports': [
      'error',
      {
        // These paths lead to circular import issues in Flipper app and are forbidden
        paths: ['flipper'],
        patterns: ['app/src/*'],
      },
    ],
  },
};
