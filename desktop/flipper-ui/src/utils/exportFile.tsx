/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import FileSaver from 'file-saver';

export async function exportFile(
  data: string,
  {defaultPath}: {defaultPath?: string},
) {
  const file = new File([data], defaultPath ?? 'unknown', {
    type: 'text/plain;charset=utf-8',
  });
  FileSaver.saveAs(file);
  return defaultPath;
}

export async function exportFileBinary(
  data: Uint8Array,
  {defaultPath}: {defaultPath?: string},
) {
  const file = new File([data], defaultPath ?? 'unknown', {
    type: 'application/octet-stream',
  });
  FileSaver.saveAs(file);
  return defaultPath;
}
