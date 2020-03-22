/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

function isDynamicRequire(node) {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'require' &&
    (node.arguments.length !== 1 || node.arguments[0].type !== 'StringLiteral')
  );
}

module.exports = function(babel, state) {
  const t = babel.types;

  return {
    name: 'replace-dynamic-requires',
    visitor: {
      CallExpression(path) {
        if (!isDynamicRequire(path.node)) {
          return;
        }

        path.replaceWith(
          t.identifier(
            'triggerDynamicRequireError_' + state.file.opts.filename,
          ),
        );
      },
    },
  };
};
