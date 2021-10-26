/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

const fbjs = require('eslint-config-fbjs');
const prettierConfig = require('./prettierrc.json')

const pattern = /^\*\r?\n[\S\s]*Facebook[\S\s]* \* @format\r?\n/;

module.exports = {
  parser: 'babel-eslint',
  root: true,
  extends: ['fbjs', 'prettier'],
  plugins: [
    ...fbjs.plugins,
    'header',
    'prettier',
    '@typescript-eslint',
    'import',
  ],
  rules: {
    // disable rules from eslint-config-fbjs
    'no-new': 0, // new keyword needed e.g. new Notification
    'no-catch-shadow': 0, // only relevant for IE8 and below
    'no-bitwise': 0, // bitwise operations needed in some places
    'consistent-return': 0,
    'no-var': 2,
    'prefer-const': [2, {destructuring: 'all'}],
    'prefer-spread': 1,
    'prefer-rest-params': 1,
    'no-console': 0, // we're setting window.console in App.js
    'no-multi-spaces': 2,
    'prefer-promise-reject-errors': 1,
    'no-throw-literal': 'error',
    'no-extra-boolean-cast': 2,
    'no-extra-semi': 2,
    'no-unsafe-negation': 2,
    'no-useless-computed-key': 2,
    'no-useless-rename': 2,

    // additional rules for this project
    'header/header': [2, 'block', {pattern}],
    'prettier/prettier': [2, prettierConfig],
    'import/no-unresolved': [2, {commonjs: true, amd: true}],
  },
  settings: {
    'import/resolver': {
      typescript: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },
  overrides: [
    {
      files: ['*.tsx', '*.ts'],
      parser: '@typescript-eslint/parser',
      rules: {
        'prettier/prettier': [2, {...prettierConfig, parser: 'typescript'}],
        // following rules are disabled because TS already handles it
        'no-undef': 0,
        '@typescript-eslint/no-unused-vars': [
          1,
          {
            ignoreRestSiblings: true,
            varsIgnorePattern: '^_',
            argsIgnorePattern: '^_',
            caughtErrorsIgnorePattern: '^_',
          },
        ],
      },
    },
  ],
};
