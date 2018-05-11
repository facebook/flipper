/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

const fs = require('fs');
const path = require('path');
const replaceFBStubs = fs.existsSync(
  path.join(__dirname, '..', '..', 'src', 'fb'),
);

const requireFromFolder = (folder, path) =>
  new RegExp(folder + '/[A-Za-z0-9.-_]+(.js)?$', 'g').test(path);

module.exports = function(babel) {
  return {
    name: 'replace-dynamic-requires',
    visitor: {
      CallExpression(path) {
        if (
          replaceFBStubs &&
          path.node.type === 'CallExpression' &&
          path.node.callee.type === 'Identifier' &&
          path.node.callee.name === 'require' &&
          path.node.arguments.length > 0
        ) {
          if (requireFromFolder('fb', path.node.arguments[0].value)) {
            throw new Error(
              'Do not requrie directly from fb/, but rather from fb-stubs/ to not break flow-typing and make sure stubs are uptodate.',
            );
          } else if (
            requireFromFolder('fb-stubs', path.node.arguments[0].value)
          ) {
            path.node.arguments[0].value = path.node.arguments[0].value.replace(
              '/fb-stubs/',
              '/fb/',
            );
          }
        }
      },
    },
  };
};
