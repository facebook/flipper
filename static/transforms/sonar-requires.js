/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

// $FlowFixMe
module.exports = ({types: t}) => ({
  visitor: {
    // $FlowFixMe
    CallExpression(path, state) {
      const node = path.node;
      const args = node.arguments || [];

      if (
        node.callee.name === 'require' &&
        args.length === 1 &&
        t.isStringLiteral(args[0]) &&
        args[0].value === 'sonar'
      ) {
        path.replaceWith(t.identifier('window.Sonar'));
      } else if (
        node.callee.name === 'require' &&
        args.length > 0 &&
        t.isStringLiteral(args[0]) &&
        args[0].value === 'react'
      ) {
        path.replaceWith(t.identifier('window.React'));
      } else if (
        node.callee.name === 'require' &&
        args.length > 0 &&
        t.isStringLiteral(args[0]) &&
        args[0].value === 'react-dom'
      ) {
        path.replaceWith(t.identifier('window.ReactDOM'));
      }
    },
    Identifier(path) {
      if (path.node.name === 'React' && path.parentPath.node.id !== path.node) {
        path.replaceWith(t.identifier('window.React'));
      }
    },
  },
});
