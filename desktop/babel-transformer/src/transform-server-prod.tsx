/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {default as doTransform} from './transform';
import {default as getCacheKey} from './get-cache-key';

const presets = [
  [
    '@babel/preset-env',
    {
      targets: {
        node: 'current',
      },
    },
  ],
];

// In PROD builds, we bundle up all node_modules as well, so that there is a single JS file to run in the end, without
// needing to install deps for either flipper-server or flipper-server-core.
// This is also the reason that all server deps are DEV deps
// electron-requires makes sure that *only* requires of built in node_modules are using "electronRequire"
// (which effectively makes them external, as electronRequire === require, but not rolled up with Metro)
const plugins = [
  require('./fsevents-dynamic-imports'),
  require('./electron-requires'),
  require('./plugin-flipper-requires'),
  require('./fb-stubs'),
];

module.exports = {
  transform,
  getCacheKey,
};

function transform({
  filename,
  options,
  src,
}: {
  filename: string;
  options: any;
  src: string;
}) {
  return doTransform({filename, options, src, presets, plugins});
}
