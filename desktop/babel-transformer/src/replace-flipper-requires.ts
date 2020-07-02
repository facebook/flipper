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
  isStringLiteral,
  identifier,
  Identifier,
} from '@babel/types';
import {NodePath} from '@babel/traverse';

const requireReplacements: any = {
  flipper: 'global.Flipper',
  'flipper-plugin': 'global.FlipperPlugin',
  react: 'global.React',
  'react-dom': 'global.ReactDOM',
  adbkit: 'global.adbkit',
  immer: 'global.Immer',
};

export function tryReplaceFlipperRequire(path: NodePath<CallExpression>) {
  const node = path.node;
  const args = node.arguments || [];
  if (
    node.callee.type === 'Identifier' &&
    node.callee.name === 'require' &&
    args.length === 1 &&
    isStringLiteral(args[0])
  ) {
    const replacement = requireReplacements[args[0].value];
    if (replacement) {
      path.replaceWith(identifier(replacement));
      return true;
    }
  }
  return false;
}

export function tryReplaceGlobalReactUsage(path: NodePath<Identifier>) {
  if (
    path.node.name === 'React' &&
    (path.parentPath.node as any).id !== path.node &&
    !isReactImportIdentifier(path)
  ) {
    path.replaceWith(identifier('global.React'));
    return true;
  }
  return false;
}

function isReactImportIdentifier(path: NodePath<Identifier>) {
  return (
    path.parentPath.node.type === 'ImportNamespaceSpecifier' &&
    path.parentPath.node.local.name === 'React'
  );
}
