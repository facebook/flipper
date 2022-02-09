/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {createESLintRule} from '../utils/createEslintRule';

type Options = [];

export type MessageIds = 'noInterfacePropsOrState';
export const RULE_NAME = 'no-interface-props-or-state';

export default createESLintRule<Options, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'problem',
    docs: {
      description: 'Use type aliases for component props instead of interfaces',
      recommended: 'error',
    },
    schema: [],
    messages: {
      noInterfacePropsOrState:
        'Use type aliases for component props and state instead of interfaces',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      TSInterfaceDeclaration(node) {
        if (
          !(node.id.name.endsWith('Props') || node.id.name.endsWith('State'))
        ) {
          return;
        }

        context.report({
          node: node.id,
          messageId: 'noInterfacePropsOrState',
        });
      },
    };
  },
}) as any /* unnameable return type */;
