/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// Eslint rules cascade. Rules defined here are merged with the rules
// defined in the parent directory.

// Somewhat ironically, this particular file is not actually transformed by Babel
// and can't have ES6 imports/exports.
// eslint-disable-line import/no-commonjs
module.exports = {
  plugins: ['import'],
  rules: {
    // Import rules from https://www.npmjs.com/package/eslint-plugin-import
    'import/no-commonjs': 1,
  },
};
