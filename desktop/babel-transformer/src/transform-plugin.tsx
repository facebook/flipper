/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {default as doTransform} from './transform';

const presets = [require('@babel/preset-react')];
const plugins = [
  require('./fsevents-dynamic-imports'),
  require('./plugin-flipper-requires'),
  require('./fb-stubs'),
];
export default function transform({
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
