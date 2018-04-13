/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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

module.exports = function(babel) {
  const t = babel.types;

  return {
    name: 'replace-dynamic-requires',
    visitor: {
      CallExpression(path) {
        if (!isDynamicRequire(path.node)) {
          return;
        }

        path.replaceWith(t.identifier('triggerDynamicRequireError'));
      },
    },
  };
};
