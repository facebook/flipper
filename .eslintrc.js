/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

const fbjs = require('eslint-config-fbjs');

// enforces copyright header and @format directive to be present in every file
const pattern = /^\*\n \* Copyright 20\d{2}-present Facebook\.\n \* This source code is licensed under the MIT license found in the\n \* LICENSE file in the root directory of this source tree\.\n \* @format\n./;

module.exports = {
  extends: 'fbjs',
  plugins: [...fbjs.plugins, 'header', 'prettier'],
  rules: {
    // disable rules from eslint-config-fbjs
    'react/react-in-jsx-scope': 0, // not needed with our metro implementation
    'no-new': 0, // new keyword needed e.g. new Notification
    'no-catch-shadow': 0, // only relevant for IE8 and below
    'no-bitwise': 0, // bitwise operations needed in some places
    'consistent-return': 0,
    'max-len': 0, // let's take prettier take care of this
    indent: 0, // let's take prettier take care of this
    'no-console': 0, // we're setting window.console in App.js

    // additional rules for this project
    'header/header': [2, 'block', {pattern}],
    'prettier/prettier': [2, 'fb', '@format'],
  },
};
