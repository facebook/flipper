/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {CallExpression} from '@babel/types';
import {NodePath} from '@babel/traverse';

module.exports = () => ({
  name: 'change-electron-to-electronRequire-in-main',
  visitor: {
    CallExpression(path: NodePath<CallExpression>) {
      const node = path.node;
      if (
        node.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        node.callee.name === 'require' &&
        node.arguments.length === 1 &&
        node.arguments[0].type === 'StringLiteral'
      ) {
        const source = node.arguments[0].value;
        if (!source.startsWith('./')) {
          node.callee.name = 'electronRequire';
        }
      }
    },
  },
});
