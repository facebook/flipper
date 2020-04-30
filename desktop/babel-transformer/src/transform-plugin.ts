/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {default as doTransform} from './transform';
import {default as flipperEnv} from './flipper-env';

export default function transform({
  filename,
  options,
  src,
  presets,
  plugins,
}: {
  filename: string;
  options: any;
  src: string;
  presets?: any[];
  plugins?: any[];
}) {
  presets = presets ?? [require('@babel/preset-react')];
  plugins = plugins ?? [];
  if (flipperEnv.FLIPPER_FB) {
    plugins.push(require('./fb-stubs'));
  }
  if (flipperEnv.FLIPPER_HEADLESS) {
    plugins.push(require('./electron-stubs'));
  }
  plugins.push(require('./electron-requires'));
  plugins.push(require('./plugin-flipper-requires'));
  return doTransform({filename, options, src, presets, plugins});
}
