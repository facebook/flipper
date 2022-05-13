/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {CallExpression} from '@babel/types';
import {NodePath} from '@babel/traverse';

// Core modules can be required as `node:fs` to bypass teh require cache
// https://nodejs.org/api/modules.html#core-modules
// It is not supported for "require" until Node v14.18.
// TODO: Remove this transform when we upgrade electron and node.js
const bypassRequireCachePrefix = 'node:';

module.exports = () => ({
  name: 'change-require-to-electronRequire-in-electron-app',
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
        if (source.startsWith(bypassRequireCachePrefix)) {
          node.arguments[0].value = source.substring(
            bypassRequireCachePrefix.length,
          );
        }
      }
    },
  },
});
