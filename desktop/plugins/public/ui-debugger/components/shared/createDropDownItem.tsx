/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export function createDropDownItem<T>(
  wireframeMode: T,
  label: string,
  icon?: React.ReactNode,
) {
  return {key: wireframeMode, label, icon};
}
