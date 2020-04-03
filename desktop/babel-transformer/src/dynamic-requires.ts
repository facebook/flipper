/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {CallExpression, identifier} from '@babel/types';
import {NodePath} from '@babel/traverse';

function isDynamicRequire(node: CallExpression) {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'require' &&
    (node.arguments.length !== 1 || node.arguments[0].type !== 'StringLiteral')
  );
}

module.exports = () => ({
  name: 'replace-dynamic-requires',
  visitor: {
    CallExpression(path: NodePath<CallExpression>) {
      path.node;
      if (!isDynamicRequire(path.node)) {
        return;
      }
      path.replaceWith(identifier('triggerDynamicRequireError'));
    },
  },
});
