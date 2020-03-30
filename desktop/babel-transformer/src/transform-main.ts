/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {default as doTransform} from './transform';
import {default as getCacheKey} from './get-cache-key';
import {default as flipperEnv} from './flipper-env';

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
  const presets = [
    [
      require('@babel/preset-env'),
      {targets: {electron: flipperEnv.FLIPPER_ELECTRON_VERSION}},
    ],
  ];
  const plugins = [];
  if (flipperEnv.FLIPPER_FB) {
    plugins.push(require('./fb-stubs'));
  }
  plugins.push(require('./electron-requires-main'));
  plugins.push(require('./electron-process'));
  return doTransform({filename, options, src, presets, plugins});
}
