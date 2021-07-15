/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

const fbjs = require('eslint-config-fbjs');

// enforces copy-right header and @format directive to be present in every file
const pattern = /^\*\r?\n[\S\s]*Facebook[\S\s]* \* @format\r?\n/;

// This list should match the replacements defined in `replace-flipper-requires.ts` and `dispatcher/plugins.tsx`
const builtInModules = [
  'fb-qpl-xplat',
  'flipper',
  'flipper-plugin',
  'flipper-plugin-lib',
  'react',
  'react-dom',
  'electron',
  'adbkit',
  'antd',
  'immer',
  '@emotion/styled',
  '@ant-design/icons',
];

const prettierConfig = require('./.prettierrc.json');

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
    'flipper',
    'promise',
  ],
  rules: {
    // disable rules from eslint-config-fbjs
    'flowtype/define-flow-type': 0,
    'flowtype/use-flow-type': 0,
    'react/react-in-jsx-scope': 0, // not needed with our metro implementation
    // Disallow boolean JSX properties set to true, e.g. `grow={true}`.
    'react/jsx-boolean-value': ['warn', 'never'],
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'react/jsx-key': 'error',
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
    'no-restricted-properties': [
      1,
      {
        object: 'electron',
        property: 'remote',
      },
    ],
    'no-restricted-imports': [
      1,
      {
        name: 'flipper',
        message:
          "Direct imports from 'flipper' are deprecated. Import from 'flipper-plugin' instead, which can be tested and distributed stand-alone. See https://fbflipper.com/docs/extending/sandy-migration for more details.",
      },
      {
        name: 'electron',
        message:
          "Direct imports from 'electron' are deprecated. Most functions can be found in getFlipperLib() from flipper-plugin package instead.",
      },
    ],

    // additional rules for this project
    'header/header': [2, 'block', {pattern}],
    'prettier/prettier': [2, prettierConfig],
    'import/no-unresolved': [2, {commonjs: true, amd: true}],
    'node/no-extraneous-import': [2, {allowModules: builtInModules}],
    'node/no-extraneous-require': [2, {allowModules: builtInModules}],
    'flipper/no-relative-imports-across-packages': [2],
    'flipper/no-electron-remote-imports': [1],
    'flipper/no-console-error-without-context': [1],

    // promise rules, see https://github.com/xjamundx/eslint-plugin-promise for details on each of them
    'promise/catch-or-return': 'warn',
    'promise/no-nesting': 'warn',
    'promise/no-promise-in-callback': 'warn',
    'promise/no-callback-in-promise': 'warn',
    'promise/no-return-in-finally': 'warn',
    'promise/valid-params': 'error',
  },
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        project: '.',
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
        'import/no-unresolved': 0,
        // following rules are disabled because they don't handle TS correctly,
        // while their @typescript-eslint counterpart does
        // for reference: https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/README.md#extension-rules
        'no-unused-vars': 0,
        'no-redeclare': 0,
        'no-dupe-class-members': 0,
        '@typescript-eslint/no-redeclare': 1,
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
