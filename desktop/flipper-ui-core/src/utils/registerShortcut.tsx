/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import hotkeys from 'hotkeys-js';

export function registerShortcut(
  accelerator: string,
  handler: () => void,
): () => void {
  // normalize between Electron defined shortcuts format, and hotkeys format
  // split acceleratos like Shift+CmdOrCtrl+Z into Shift+Cmd+Z,Shift+Control+Z
  if (accelerator.includes('CmdOrCtrl')) {
    accelerator =
      accelerator.replace('CmdOrCtrl', 'Cmd') +
      ',' +
      accelerator.replace('CmdOrCtrl', 'Ctrl');
  }
  hotkeys(accelerator, handler);
  return () => {
    hotkeys.unbind(accelerator, handler);
  };
}
