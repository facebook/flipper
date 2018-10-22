/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

var babylon = require('@babel/parser');
var fs = require('fs');

var electronStubs = babylon.parseExpression(
  fs.readFileSync('static/electron-stubs.notjs').toString(),
);
var perfHooks = babylon.parseExpression("require('perf_hooks').performance");

module.exports = function(babel) {
  return {
    name: 'replace-electron-requires-with-stubs',
    visitor: {
      CallExpression(path) {
        if (
          path.node.type === 'CallExpression' &&
          path.node.callee.type === 'Identifier' &&
          path.node.callee.name === 'require' &&
          path.node.arguments.length > 0
        ) {
          if (path.node.arguments[0].value === 'electron') {
            path.replaceWith(electronStubs);
          }
        }
        if (
          path.node.type === 'CallExpression' &&
          path.node.callee.type === 'MemberExpression' &&
          path.node.callee.object.name === 'performance'
        ) {
          // 'perf_hooks' was added in Node 8.5.0 but doesn't appear to be
          // present in electron. We can remove this and switch to using
          // interval when it is. Until then, continue using browser.performance
          // for real and swap in node's perf_hooks when we dont have electron.
          path.node.callee.object = perfHooks;
        }
      },
    },
  };
};
