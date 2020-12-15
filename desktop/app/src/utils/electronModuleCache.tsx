/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export function unloadModule(path: string) {
  const resolvedPath = global.electronRequire.resolve(path);
  if (!resolvedPath || !global.electronRequire.cache[resolvedPath]) {
    return;
  }
  delete global.electronRequire.cache[resolvedPath];
}
