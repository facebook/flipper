/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {TSESLint} from '@typescript-eslint/experimental-utils';
import rule, {RULE_NAME} from '../noRelativeImportsAcrossPackages';

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
      code: `import * as testUtils from 'flipper-test-utils';`,
      filename: __filename,
    },
    {
      code: `const testUtils = require('flipper-test-utils');`,
      filename: __filename,
    },
    {
      code: `import rule, {RULE_NAME} from '../noRelativeImportsAcrossPackages';`,
      filename: __filename,
    },
    {
      code: `require('../noRelativeImportsAcrossPackages');`,
      filename: __filename,
    },
    {
      code: `import m from './subdir/module';`,
      filename: __filename,
    },
  ],
  invalid: [
    {
      code: `import * as pathUtils from '../../../../test-utils/src/pathUtils';`,
      filename: __filename,
      errors: [{messageId: 'noRelativeImportsAcrossPackages'}],
    },
    {
      code: `require('../../../../test-utils/src/pathUtils');`,
      filename: __filename,
      errors: [{messageId: 'noRelativeImportsAcrossPackages'}],
    },
  ],
});
