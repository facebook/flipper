/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {TSESLint} from '@typescript-eslint/experimental-utils';
import rule, {RULE_NAME} from '../noConsoleErrorWithoutContext';

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
      code: `console.error("I've made a big mistake:", err);`,
      filename: __filename,
    },
    {
      code: `console.error("This should never happen.");`,
      filename: __filename,
    },
    {
      code: `console.error("Failed to open user settings: " + err);`,
      filename: __filename,
    },
    {
      code: `console.warn(e);`,
      filename: __filename,
    },
  ],
  invalid: [
    {
      code: `console.error(err);`,
      filename: __filename,
      errors: [{messageId: 'noConsoleErrorWithoutContext'}],
    },
    {
      code: `console.error(err, "Too late for context.");`,
      filename: __filename,
      errors: [{messageId: 'noConsoleErrorWithoutContext'}],
    },
  ],
});
