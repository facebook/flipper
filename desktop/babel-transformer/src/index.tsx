/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {default as transform} from './transform-plugin';
import {default as getCacheKey} from './get-cache-key';

module.exports = {
  transform,
  getCacheKey,
};

export default transform;
