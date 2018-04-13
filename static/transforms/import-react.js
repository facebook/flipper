/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 * @format
 */

module.exports = function(babel) {
  const t = babel.types;

  return {
    name: 'infinity-import-react',
    visitor: {
      Program: {
        exit(path, state) {
          if (state.get('NEEDS_REACT')) {
            path.unshiftContainer('body', [
              t.variableDeclaration('var', [
                t.variableDeclarator(
                  t.identifier('React'),
                  t.callExpression(t.identifier('require'), [
                    t.stringLiteral('react'),
                  ]),
                ),
              ]),
            ]);
          }
        },
      },

      ReferencedIdentifier(path, state) {
        // mark react as needing to be imported
        if (path.node.name === 'React' && !path.scope.getBinding('React')) {
          state.set('NEEDS_REACT', true);
        }

        // replace Buffer with require('buffer')
        if (path.node.name === 'Buffer' && !path.scope.getBinding('Buffer')) {
          path.replaceWith(
            t.memberExpression(
              t.callExpression(t.identifier('require'), [
                t.stringLiteral('buffer'),
              ]),
              t.identifier('Buffer'),
            ),
          );
        }
      },
    },
  };
};
