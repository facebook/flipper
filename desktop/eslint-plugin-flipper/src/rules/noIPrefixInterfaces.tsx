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

export type MessageIds = 'noTsInterfacePrefixI';
export const RULE_NAME = 'no-i-prefix-interfaces';

export default createESLintRule<Options, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'problem',
    docs: {
      description: 'Avoid prefixing TS interfaces with "I"',
      recommended: 'error',
    },
    schema: [],
    messages: {
      noTsInterfacePrefixI: 'Do not prefix interfaces with "I"',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      TSInterfaceDeclaration(node) {
        const [l1, l2, l3] = node.id.name;
        if (
          l1 === 'I' &&
          isLetter(l2) &&
          l2 === l2.toUpperCase() &&
          isLetter(l3) &&
          l3 === l3.toLowerCase()
        ) {
          context.report({
            node: node.id,
            messageId: 'noTsInterfacePrefixI',
          });
        }
      },
    };
  },
}) as any /* unnameable return type */;

function isLetter(x: string | undefined): boolean {
  return typeof x === 'string' && /^[a-z]$/i.test(x);
}
