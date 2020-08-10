/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {TextDecoder} from 'util';

export function combineBase64Chunks(chunks: string[]): string {
  const byteArray = chunks.map(
    (b64Chunk) =>
      Uint8Array.from(atob(b64Chunk), (c) => c.charCodeAt(0)).buffer,
  );
  const size = byteArray
    .map((b) => b.byteLength)
    .reduce((prev, curr) => prev + curr, 0);
  const buffer = new Uint8Array(size);
  let offset = 0;
  for (let i = 0; i < byteArray.length; i++) {
    buffer.set(new Uint8Array(byteArray[i]), offset);
    offset += byteArray[i].byteLength;
  }
  const data = new TextDecoder('utf-8').decode(buffer);
  return data;
}
