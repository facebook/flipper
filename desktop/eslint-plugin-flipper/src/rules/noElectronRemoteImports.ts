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

export type MessageIds = 'noElectronRemoteImports';
export const RULE_NAME = 'no-electron-remote-imports';

export default createESLintRule<Options, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'suggestion',
    docs: {
      description: '`remote` is slow. Please be careful when using it.',
      category: 'Possible Errors',
      recommended: 'warn',
    },
    schema: [],
    messages: {
      noElectronRemoteImports:
        'Accessing properties on the `remote` object is blocking and 10,000x slower than a local one. Please consider alternatives or cache your access.',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (node.source.value === 'electron') {
          const hasImport =
            node.specifiers.filter(
              (v) =>
                v.type === 'ImportSpecifier' && v.imported.name === 'remote',
            ).length > 0;
          if (hasImport) {
            context.report({
              node,
              messageId: 'noElectronRemoteImports',
            });
          }
        }
      },
    };
  },
});
