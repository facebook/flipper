/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {CallExpression, identifier} from '@babel/types';
import {NodePath} from '@babel/traverse';

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

module.exports = () => ({
  name: 'infinity-import-react',
  visitor: {
    CallExpression(path: NodePath<CallExpression>) {
      const node = path.node;
      if (
        node.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        node.callee.name === 'require' &&
        node.arguments.length === 1 &&
        node.arguments[0].type === 'StringLiteral'
      ) {
        const source = node.arguments[0].value;
        if (
          BUILTINS.includes(source) ||
          BUILTINS.some((moduleName) => source.startsWith(`${moduleName}/`))
        ) {
          node.callee.name = 'electronRequire';
        }

        if (IGNORED_MODULES.includes(source)) {
          path.replaceWith(identifier('triggerReferenceError'));
        }
      }
    },
  },
});
