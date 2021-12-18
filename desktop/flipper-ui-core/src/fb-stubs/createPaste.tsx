/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export default function createPaste(
  _input: string,
): Promise<string | undefined> {
  return Promise.reject(new Error('Not implemented!'));
}

export type CreatePasteResult = {
  number: number;
  url: string;
};

export async function createPasteWithDetails(_details: {
  title?: string;
  content: string;
}): Promise<CreatePasteResult | undefined> {
  return Promise.reject(new Error('Not implemented!'));
}
