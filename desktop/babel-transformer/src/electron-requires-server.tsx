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

import {resolve} from 'path';
import {BUILTINS, IGNORED_MODULES} from './electron-requires';

const pluginsRootDir = resolve(__dirname, '../../plugins');

function isPlugin(path: string) {
  // We should bundle dependencies for plugins
  return path.startsWith(pluginsRootDir);
}

module.exports = () => ({
  name: 'change-require-to-electronRequire-in-server',
  visitor: {
    CallExpression(path: NodePath<CallExpression>, state: any) {
      const node = path.node;
      if (
        node.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        node.callee.name === 'require' &&
        node.arguments.length === 1 &&
        node.arguments[0].type === 'StringLiteral'
      ) {
        const source = node.arguments[0].value;
        if (
          // relative files should be bundled
          source.startsWith('./') ||
          source.startsWith('../') ||
          // other packages from the workspace should be bundled up and transformed!
          source.startsWith('flipper-') ||
          // Dependencies for bundled plugins (server add-ons) should be included
          (isPlugin(state.file.opts.filename) &&
            // yet we should exclude built-ins
            !(
              BUILTINS.includes(source) ||
              BUILTINS.some((moduleName) =>
                source.startsWith(`${moduleName}/`),
              ) ||
              IGNORED_MODULES.includes(source) ||
              IGNORED_MODULES.some((moduleName) =>
                source.startsWith(`${moduleName}/`),
              )
            ))
        ) {
          return;
        }

        node.callee.name = 'electronRequire';
      }
      if (
        node.callee.type === 'MemberExpression' &&
        node.callee.object.type === 'Identifier' &&
        node.callee.object.name === 'require' &&
        node.callee.property.type === 'Identifier' &&
        node.callee.property.name === 'resolve' &&
        node.arguments.length === 1 &&
        node.arguments[0].type == 'StringLiteral'
      ) {
        node.callee.object.name = 'electronRequire';
      }
    },
  },
});
