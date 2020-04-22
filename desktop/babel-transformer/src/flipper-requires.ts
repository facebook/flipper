/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  CallExpression,
  Identifier,
  isStringLiteral,
  identifier,
} from '@babel/types';
import {NodePath} from '@babel/traverse';

import {resolve, dirname, relative} from 'path';

// do not apply this transform for these paths
const EXCLUDE_PATHS = [
  '/node_modules/react-devtools-core/',
  'relay-devtools/DevtoolsUI',
];

function isExcludedPath(path: string) {
  for (const epath of EXCLUDE_PATHS) {
    if (path.indexOf(epath) > -1) {
      return true;
    }
  }
  return false;
}
function isReactImportIdentifier(path: NodePath<Identifier>) {
  return (
    path.parentPath.node.type === 'ImportNamespaceSpecifier' &&
    path.parentPath.node.local.name === 'React'
  );
}
module.exports = () => ({
  visitor: {
    CallExpression(path: NodePath<CallExpression>, state: any) {
      if (isExcludedPath(state.file.opts.filename)) {
        return;
      }
      const node = path.node;
      const args = node.arguments || [];

      if (
        node.callee.type === 'Identifier' &&
        node.callee.name === 'require' &&
        args.length === 1 &&
        isStringLiteral(args[0])
      ) {
        if (args[0].value === 'flipper') {
          path.replaceWith(identifier('global.Flipper'));
        } else if (args[0].value === 'react') {
          path.replaceWith(identifier('global.React'));
        } else if (args[0].value === 'react-dom') {
          path.replaceWith(identifier('global.ReactDOM'));
        } else if (args[0].value === 'adbkit') {
          path.replaceWith(identifier('global.adbkit'));
        } else if (
          // require a file not a pacakge
          args[0].value.indexOf('/') > -1 &&
          // in the plugin itself and not inside one of its dependencies
          state.file.opts.filename.indexOf('node_modules') === -1 &&
          // the resolved path for this file is outside the plugins root
          !resolve(
            state.file.opts.root,
            relative(state.file.opts.cwd, dirname(state.file.opts.filename)),
            args[0].value,
          ).startsWith(state.file.opts.root)
        ) {
          throw new Error(
            `Plugins cannot require files from outside their folder. Attempted to require ${resolve(
              state.file.opts.root,
              relative(state.file.opts.cwd, dirname(state.file.opts.filename)),
              args[0].value,
            )} which isn't inside ${state.file.opts.root}`,
          );
        }
      }
    },
    Identifier(path: NodePath<Identifier>, state: any) {
      if (
        path.node.name === 'React' &&
        (path.parentPath.node as any).id !== path.node &&
        !isReactImportIdentifier(path) &&
        !isExcludedPath(state.file.opts.filename)
      ) {
        path.replaceWith(identifier('global.React'));
      }
    },
  },
});
