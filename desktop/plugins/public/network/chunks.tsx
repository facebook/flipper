/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import type {PartialResponse, ResponseInfo} from './types';
import {Base64} from 'js-base64';

export function assembleChunksIfResponseIsComplete(
  partialResponseEntry: PartialResponse | undefined,
): ResponseInfo | undefined {
  const numChunks = partialResponseEntry?.initialResponse?.totalChunks;
  if (
    !numChunks ||
    !partialResponseEntry?.initialResponse ||
    Object.keys(partialResponseEntry.followupChunks).length + 1 < numChunks
  ) {
    // Partial response not yet complete, do nothing.
    return;
  }

  // Partial response has all required chunks, convert it to a full Response.
  const response: ResponseInfo = partialResponseEntry.initialResponse;
  const allChunks: string[] =
    response.data != null
      ? [
          response.data,
          ...Object.entries(partialResponseEntry.followupChunks)
            // It's important to parseInt here or it sorts lexicographically
            .sort((a, b) => parseInt(a[0], 10) - parseInt(b[0], 10))
            .map(([_k, v]: [string, string]) => v),
        ]
      : [];
  const data = combineBase64Chunks(allChunks);

  return {
    ...response,
    // Currently data is always decoded at render time, so re-encode it to match the single response format.
    data,
  };
}

export function combineBase64Chunks(chunks: string[]): string {
  const byteArray = chunks.map((b64Chunk) => {
    return Base64.toUint8Array(b64Chunk);
  });
  const size = byteArray
    .map((b) => b.byteLength)
    .reduce((prev, curr) => prev + curr, 0);

  const buffer = new Uint8Array(size);
  let offset = 0;
  for (let i = 0; i < byteArray.length; i++) {
    buffer.set(byteArray[i], offset);
    offset += byteArray[i].byteLength;
  }

  return Base64.fromUint8Array(buffer);
}
