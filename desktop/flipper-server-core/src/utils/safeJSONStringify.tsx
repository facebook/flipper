/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export const safeJSONStringify = (data: unknown): string => {
  try {
    return JSON.stringify(data);
  } catch {
    return 'Unable to serialize';
  }
};
