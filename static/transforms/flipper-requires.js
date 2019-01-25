/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

const {resolve, dirname} = require('path');

// do not apply this transform for these paths
const EXCLUDE_PATHS = [
  '/node_modules/react-devtools-core/',
  'relay-devtools/DevtoolsUI',
];

function isExcludedPath(path) {
  for (const epath of EXCLUDE_PATHS) {
    if (path.indexOf(epath) > -1) {
      return true;
    }
  }
  return false;
} // $FlowFixMe
module.exports = ({types: t}) => ({
  visitor: {
    // $FlowFixMe
    CallExpression(path, state) {
      if (isExcludedPath(state.file.opts.filename)) {
        return;
      }
      const node = path.node;
      const args = node.arguments || [];

      if (
        node.callee.name === 'require' &&
        args.length === 1 &&
        t.isStringLiteral(args[0])
      ) {
        if (args[0].value === 'flipper') {
          path.replaceWith(t.identifier('global.Flipper'));
        } else if (args[0].value === 'react') {
          path.replaceWith(t.identifier('global.React'));
        } else if (args[0].value === 'react-dom') {
          path.replaceWith(t.identifier('global.ReactDOM'));
        } else if (
          // require a file not a pacakge
          args[0].value.indexOf('/') > -1 &&
          // in the plugin itself and not inside one of its dependencies
          state.file.opts.filename.indexOf('node_modules') === -1 &&
          // the resolved path for this file is outside the plugins root
          !resolve(dirname(state.file.opts.filename), args[0].value).startsWith(
            state.file.opts.root,
          ) &&
          !resolve(dirname(state.file.opts.filename), args[0].value).indexOf(
            '/static/',
          ) < 0
        ) {
          throw new Error(
            `Plugins cannot require files from outside their folder. Attempted to require ${resolve(
              dirname(state.file.opts.filename),
              args[0].value,
            )} which isn't inside ${state.file.opts.root}`,
          );
        }
      }
    },
    Identifier(path, state) {
      if (
        path.node.name === 'React' &&
        path.parentPath.node.id !== path.node &&
        !isExcludedPath(state.file.opts.filename)
      ) {
        path.replaceWith(t.identifier('global.React'));
      }
    },
  },
});
