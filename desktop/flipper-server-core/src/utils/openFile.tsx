/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import fs from 'fs-extra';
import open from 'open';

export async function openFile(path: string | null) {
  if (!path) {
    return;
  }

  let fileStat;
  try {
    fileStat = await fs.stat(path);
  } catch (err) {
    throw new Error(`Couldn't open file: ${path}: ${err}`);
  }

  // Rather randomly chosen. Some FSs still reserve 8 bytes for empty files.
  // If this doesn't reliably catch "corrupt" files, you might want to increase this.
  if (fileStat.size <= 8) {
    throw new Error('File seems to be (almost) empty: ' + path);
  }

  await open(path);
}
