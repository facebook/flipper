/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

declare module 'json-format-highlight' {
  export interface ColorOptions {
    keyColor?: string;
    numberColor?: string;
    stringColor?: string;
    trueColor?: string;
    falseColor?: string;
    nullColor?: string;
  }

  export default function (json: any, colorOptions?: ColorOptions);
}
