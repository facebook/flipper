/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export const BUILTINS = [
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
  'perf_hooks',
  'worker_threads',
  'encoding',
  'fsevents',
  './fsevents.node',
  // jest is referred to in source code, like in TestUtils, but we don't want to ever bundle it up!
  'jest',
  '@testing-library/react',
  '@testing-library/dom',
];
