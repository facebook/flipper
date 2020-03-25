/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

const BUILTINS = [
  'electron',
  'buffer',
  'child_process',
  'crypto',
  'dgram',
  'dns',
  'fs',
  'http',
  'https',
  'net',
  'os',
  'readline',
  'stream',
  'string_decoder',
  'tls',
  'tty',
  'zlib',
  'constants',
  'events',
  'url',
  'assert',
  'util',
  'path',
  'perf_hooks',
  'punycode',
  'querystring',
  'cluster',
  'console',
  'module',
  'process',
  'vm',
  'domain',
  'v8',
  'repl',
  'timers',
  'node-fetch',
];

const IGNORED_MODULES = [
  'bufferutil',
  'utf-8-validate',
  'spawn-sync',
  './src/logcat',
  './src/monkey',
  './src/adb',
];

function isRequire(node) {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'require' &&
    node.arguments.length === 1 &&
    node.arguments[0].type === 'StringLiteral'
  );
}

module.exports = function (babel) {
  const t = babel.types;

  return {
    name: 'infinity-import-react',
    visitor: {
      CallExpression(path) {
        if (!isRequire(path.node)) {
          return;
        }

        const source = path.node.arguments[0].value;

        if (
          BUILTINS.includes(source) ||
          BUILTINS.some(moduleName => source.startsWith(`${moduleName}/`))
        ) {
          path.node.callee.name = 'electronRequire';
        }

        if (IGNORED_MODULES.includes(source)) {
          path.replaceWith(t.identifier('triggerReferenceError'));
        }
      },
    },
  };
};
