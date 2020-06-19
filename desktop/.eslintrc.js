/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

const fbjs = require('eslint-config-fbjs');

// enforces copyright header and @format directive to be present in every file
const pattern = /^\*\r?\n[\S\s]*Facebook[\S\s]* \* @format\r?\n/;

const builtInModules = [
  'flipper',
  'react',
  'react-dom',
  'electron',
  'adbkit',
  'immer',
  '@emotion/styled',
];

const prettierConfig = require('./.prettierrc');

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
    'node',
    'react-hooks',
  ],
  rules: {
    // disable rules from eslint-config-fbjs
    'react/react-in-jsx-scope': 0, // not needed with our metro implementation
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
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
    'flowtype/object-type-delimiter': [0],
    'import/no-unresolved': [2, {commonjs: true, amd: true}],
    'node/no-extraneous-import': [2, {allowModules: builtInModules}],
    'node/no-extraneous-require': [2, {allowModules: builtInModules}],
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
