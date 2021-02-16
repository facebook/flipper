/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {TSESLint} from '@typescript-eslint/experimental-utils';
import rule, {RULE_NAME} from '../noElectronRemoteImports';

const tester = new TSESLint.RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020,
  },
});

tester.run(RULE_NAME, rule, {
  valid: [
    {
      code: `import {something} from 'electron';`,
      filename: __filename,
    },
    {
      code: `import remote from 'electron';`,
      filename: __filename,
    },
    {
      code: `import remote from './electron';`,
      filename: __filename,
    },
  ],
  invalid: [
    {
      code: `import {remote} from 'electron';`,
      filename: __filename,
      errors: [{messageId: 'noElectronRemoteImports'}],
    },
    {
      code: `import {remote, somethingelse} from 'electron';`,
      filename: __filename,
      errors: [{messageId: 'noElectronRemoteImports'}],
    },
    {
      code: `import {remote as notRemote} from 'electron';`,
      filename: __filename,
      errors: [{messageId: 'noElectronRemoteImports'}],
    },
  ],
});
