/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  variableDeclarator,
  variableDeclaration,
  identifier,
  callExpression,
  stringLiteral,
  memberExpression,
  Identifier,
  Program,
} from '@babel/types';
import {NodePath} from '@babel/traverse';

module.exports = () => ({
  name: 'infinity-import-react',
  visitor: {
    Program: {
      exit(path: NodePath<Program>, state: any) {
        if (state.get('NEEDS_REACT')) {
          path.unshiftContainer('body', [
            variableDeclaration('var', [
              variableDeclarator(
                identifier('React'),
                callExpression(identifier('require'), [stringLiteral('react')]),
              ),
            ]),
          ]);
        }
      },
    },

    ReferencedIdentifier(path: NodePath<Identifier>, state: any) {
      // mark react as needing to be imported
      if (path.node.name === 'React' && !path.scope.getBinding('React')) {
        state.set('NEEDS_REACT', true);
      }

      // replace Buffer with require('buffer')
      if (path.node.name === 'Buffer' && !path.scope.getBinding('Buffer')) {
        path.replaceWith(
          memberExpression(
            callExpression(identifier('require'), [stringLiteral('buffer')]),
            identifier('Buffer'),
          ),
        );
      }
    },
  },
});
