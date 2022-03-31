/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {CallExpression, identifier} from '@babel/types';
import {NodePath} from '@babel/traverse';
module.exports = () => ({
  name: 'skip-fsevents-dynamic-imports-on-win-and-linux',
  visitor: {
    CallExpression(path: NodePath<CallExpression>) {
      if (process.platform === 'darwin') {
        return;
      }

      const node = path.node;
      if (
        node.type === 'CallExpression' &&
        node.callee.type === 'Import' &&
        node.arguments.length === 1 &&
        node.arguments[0].type === 'StringLiteral'
      ) {
        const source = node.arguments[0].value;
        if (source === 'fsevents') {
          path.replaceWith(identifier('triggerReferenceError'));
        }
      }
    },
  },
});
