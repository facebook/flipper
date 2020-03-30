/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

declare module 'line-replace' {
  export default function (args: {
    file: string;
    line: number;
    text: string;
    addNewLine: boolean;
    callback: (args: {
      file: string;
      line: number;
      replacedText: string;
      text: string;
    }) => void;
  }): void;
}
