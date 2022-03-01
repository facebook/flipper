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

// In DEV builds, we keep node_modules as is, as to not waste resources on trying to bundle them
const plugins = [
  require('./electron-requires-server'),
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
