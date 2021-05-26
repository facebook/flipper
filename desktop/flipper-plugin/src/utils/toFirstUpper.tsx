/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export function toFirstUpper(name: string): string {
  if (!name) {
    return name;
  }
  if (name.length === 1) {
    return name.toUpperCase();
  }
  return name[0].toUpperCase() + name.substr(1);
}
