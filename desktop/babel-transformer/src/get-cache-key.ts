/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// Disable caching of babel transforms all together. We haven't found a good
// way to cache our transforms, as they rely on side effects like env vars or
// the existence of folders in the file system.
export default function getCacheKey() {
  return Math.random().toString(36);
}
