/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

function isRequire(node) {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'require' &&
    node.arguments.length === 1 &&
    node.arguments[0].type === 'StringLiteral'
  );
}

module.exports = function (babel, options) {
  return {
    name: 'change-electron-to-electronRequire-in-main',
    visitor: {
      CallExpression(path) {
        if (!isRequire(path.node)) {
          return;
        }

        const source = path.node.arguments[0].value;

        if (!source.startsWith('./')) {
          path.node.callee.name = 'electronRequire';
        }
      },
    },
  };
};
