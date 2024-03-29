/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

declare module 'unicode-substring' {
  const unicodeSubstring: (
    string: string,
    start: number,
    end: number,
  ) => string;
  export default unicodeSubstring;
}
