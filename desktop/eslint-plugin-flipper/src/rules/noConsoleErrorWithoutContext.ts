/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {TSESTree} from '@typescript-eslint/experimental-utils';
import {createESLintRule} from '../utils/createEslintRule';

type Options = [];

export type MessageIds = 'noConsoleErrorWithoutContext';
export const RULE_NAME = 'no-console-error-without-context';

export default createESLintRule<Options, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'problem',
    docs: {
      description: 'TBD',
      category: 'Possible Errors',
      recommended: 'warn',
    },
    schema: [],
    messages: {
      noConsoleErrorWithoutContext:
        '"Naked" console.error calls are hard to identify without providing a context. Please add a static hint, e.g. `console.error("Reading user config failed", err);`',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      ExpressionStatement(node: TSESTree.ExpressionStatement) {
        if (node.expression.type === 'CallExpression') {
          const callee = node.expression.callee;
          const isConsoleError =
            callee.type === 'MemberExpression' &&
            callee.object.type === 'Identifier' &&
            callee.object.name === 'console' &&
            callee.property.type === 'Identifier' &&
            callee.property.name === 'error';

          if (
            isConsoleError &&
            // If this is an Identifier it means the first argument is an object, e.g.
            // console.error(err);
            // Whereas a literal implies there's a static context given, e.g.
            // console.error("My identifiable error: ", err);
            // Expressions like concatenations are also fine here.
            node.expression.arguments[0]?.type === 'Identifier'
          ) {
            context.report({
              node,
              messageId: 'noConsoleErrorWithoutContext',
            });
          }
        }
      },
    };
  },
});
