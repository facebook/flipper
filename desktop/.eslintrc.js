/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

const path = require('path');

const fbjs = require('eslint-config-fbjs');

const rulesDirPlugin = require('eslint-plugin-rulesdir');
rulesDirPlugin.RULES_DIR = path.join(__dirname, 'eslint-rules');

// enforces copy-right header and @format directive to be present in every file
const pattern = /^\*\r?\n[\S\s]*Meta Platforms, Inc\.[\S\s]* \* @format\r?\n/;

// This list should match the replacements defined in `replace-flipper-requires.ts` and `dispatcher/plugins.tsx`
const builtInModules = [
  'flipper',
  'flipper-plugin',
  'flipper-plugin-lib',
  'react',
  'react-dom',
  'electron',
  'antd',
  'immer',
  '@emotion/styled',
  '@ant-design/icons',
  '@testing-library/react',
  'jest',
  'ts-jest',
];

const prettierConfig = require('./.prettierrc.json');

// We should forbid using "flipper" import. However, we have hundreds of plugins using it.
// So we forbid it everywhere but in "plugins" directory.
// To do that we need to keep "error" level of linting for most imports, but downlevel warning for "flipper" import to "warn".
// It is not possible OOTB by eslint.
// Instead, we create a clone of the "no-restricted-imports" rule and use it to split out restricted imports in two groups: warn and error.
// https://github.com/eslint/eslint/issues/14061#issuecomment-772490154
const restrictedImportsUniversalErrorConfig = {
  paths: [
    {
      name: 'electron',
      message:
        "Direct imports from 'electron' are deprecated. Most functions can be found in getFlipperLib() from flipper-plugin package instead.",
    },
  ],
  patterns: [
    {
      group: ['flipper-plugin/*'],
      message:
        "Imports from nested flipper-plugin directories are not allowed. Import from 'flipper-plugin' module directly. If it is missing an export, add it there with corresponding documentation (https://fbflipper.com/docs/extending/flipper-plugin/).",
    },
    {
      group: ['flipper-common/*'],
      message:
        "Imports from nested flipper-common directories are not allowed. Import from 'flipper-common' module directly. If it is missing an export, add it there.",
    },
    {
      group: ['flipper-ui-core/*'],
      message:
        "Imports from nested flipper-ui-core directories are not allowed. Import from 'flipper-ui-core' module directly. If it is missing an export, add it there.",
    },
    {
      group: ['antd/*'],
      message:
        "Imports from nested antd directories are not allowed. Import from 'antd' module directly. If you want to import only a type, use `import type` syntax and silence this warning.",
    },
    {
      group: ['immer/*'],
      message:
        "Imports from nested antd directories are not allowed. Import from 'antd' module directly. If you want to import only a type, use `import type` syntax and silence this warning.",
    },
    {
      group: ['@emotion/styled/*'],
      message:
        "Imports from nested @emotion/styled directories are not allowed. Import from '@emotion/styled' module directly. If you want to import only a type, use `import type` syntax and silence this warning.",
    },
    {
      group: ['@ant-design/icons/*'],
      message:
        "Imports from nested @ant-design/icons directories are not allowed. Import from '@ant-design/icons' module directly. If you want to import only a type, use `import type` syntax and silence this warning.",
    },
  ],
};

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
    'communist-spelling',
    'rulesdir',
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
      'error',
      {
        ...restrictedImportsUniversalErrorConfig,
        paths: [
          ...restrictedImportsUniversalErrorConfig.paths,
          {
            name: 'flipper',
            message:
              "Direct imports from 'flipper' are deprecated. Import from 'flipper-plugin' instead, which can be tested and distributed stand-alone. See https://fbflipper.com/docs/extending/sandy-migration for more details.",
          },
        ],
      },
    ],

    // additional rules for this project
    'header/header': [2, 'block', {pattern}],
    'prettier/prettier': [2, prettierConfig],
    'import/no-unresolved': [2, {commonjs: true, amd: true}],
    'node/no-extraneous-import': [2, {allowModules: builtInModules}],
    'node/no-extraneous-require': [2, {allowModules: builtInModules}],
    'node/no-sync': [1],
    'flipper/no-relative-imports-across-packages': [2],
    'flipper/no-electron-remote-imports': [1],
    'flipper/no-console-error-without-context': [2],
    'flipper/no-ts-file-extension': 2,
    'flipper/no-i-prefix-interfaces': 2,
    'flipper/no-interface-props-or-state': 2,
    'communist-spelling/communist-spelling': [1, {allow: ['cancelled']}],

    // promise rules, see https://github.com/xjamundx/eslint-plugin-promise for details on each of them
    'promise/catch-or-return': 'error',
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
        '@typescript-eslint/naming-convention': [
          2,
          {
            selector: 'typeLike',
            format: ['PascalCase', 'UPPER_CASE'],
            leadingUnderscore: 'allow',
          },
        ],
        '@typescript-eslint/no-non-null-assertion': 'warn',
      },
    },
    {
      files: [
        'plugins/**/*.ts',
        'plugins/**/*.tsx',
        'flipper-ui-core/**/*.tsx',
        'flipper-common/**/*.tsx',
        'flipper-frontend-core/**/*.tsx',
        'flipper-ui-browser/**/*.tsx',
        'flipper-plugin/**/*.tsx',
      ],
      excludedFiles: [
        'plugins/**/serverAddOn.ts',
        'plugins/**/serverAddOn.tsx',
      ],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            ...restrictedImportsUniversalErrorConfig,
            paths: [
              ...restrictedImportsUniversalErrorConfig.paths,
              // Ban Node.js API
              'async_hooks',
              {
                name: 'child_process',
                message:
                  "Node APIs are not allowed. Use 'getFlipperLib().remoteServerContext.child_process' from 'flipper-plugin' instead. See https://fbflipper.com/docs/extending/flipper-plugin/.",
              },
              'cluster',
              'crypto',
              'dgram',
              'dns',
              {
                name: 'fs',
                message:
                  "Node APIs are not allowed. Use 'getFlipperLib().remoteServerContext.fs' from 'flipper-plugin' instead. See https://fbflipper.com/docs/extending/flipper-plugin/.",
              },
              {
                name: 'fs-extra',
                message:
                  "Node APIs are not allowed. Use 'getFlipperLib().remoteServerContext.fs' from 'flipper-plugin' instead. See https://fbflipper.com/docs/extending/flipper-plugin/.",
              },
              'http',
              'https',
              'net',
              {
                name: 'os',
                message:
                  "Node APIs are not allowed. Use 'getFlipperLib().paths' and 'getFlipperLib().environmentInfo' from 'flipper-plugin' instead. See https://fbflipper.com/docs/extending/flipper-plugin/.",
              },
              {
                name: 'path',
                message:
                  "Node APIs are not allowed. Use 'path' from 'flipper-plugin' instead. See https://fbflipper.com/docs/extending/flipper-plugin/.",
              },
              'stream',
            ],
          },
        ],
        'rulesdir/no-restricted-imports-clone': [
          'warn',
          {
            paths: [
              {
                name: 'flipper',
                message:
                  "Direct imports from 'flipper' are deprecated. Import from 'flipper-plugin' instead, which can be tested and distributed stand-alone. See https://fbflipper.com/docs/extending/sandy-migration for more details.",
              },
            ],
          },
        ],
      },
    },
    // Overide rules for tests and service scripts (postinstall). Allow Node APIs usage there.
    {
      files: [
        'plugins/**/__tests__/**/*.tsx',
        'plugins/**/__tests__/**/*.ts',
        'flipper-ui-core/**/__tests__/**/*.tsx',
        'flipper-common/**/__tests__/**/*.tsx',
        'flipper-frontend-core/**/__tests__/**/*.tsx',
        'flipper-ui-browser/**/__tests__/**/*.tsx',
        'flipper-plugin/**/__tests__/**/*.tsx',
        'plugins/postinstall.tsx',
        // TODO: Remove specific plugin overrides down below
        'plugins/fb/kaios-portal/kaios-debugger-client/client.tsx',
      ],
      rules: {
        'no-restricted-imports': [
          'error',
          restrictedImportsUniversalErrorConfig,
        ],
        'rulesdir/no-restricted-imports-clone': [
          'warn',
          {
            paths: [
              {
                name: 'flipper',
                message:
                  "Direct imports from 'flipper' are deprecated. Import from 'flipper-plugin' instead, which can be tested and distributed stand-alone. See https://fbflipper.com/docs/extending/sandy-migration for more details.",
              },
            ],
          },
        ],
      },
    },
  ],
};
