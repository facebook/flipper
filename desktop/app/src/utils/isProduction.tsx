/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {getRenderHostInstance} from '../RenderHost';

let _isProduction: boolean | undefined;

export default function isProduction(): boolean {
  if (_isProduction === undefined) {
    _isProduction = !/node_modules[\\/]electron[\\/]/.test(
      getRenderHostInstance().paths.execPath,
    );
  }
  return _isProduction;
}
