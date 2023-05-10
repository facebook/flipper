/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export type CreatePasteArgs = {
  content: string;
  title?: string;
  showSuccessNotification?: boolean;
  showErrorNotification?: boolean;
  writeToClipboard?: boolean;
  language?: string;
};

export type CreatePasteResult = {
  number: number;
  url: string;
};
