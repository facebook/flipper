/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Settings} from 'flipper-common';
import {getRenderHostInstance} from '../RenderHost';

export function loadTheme(theme: Settings['darkMode']) {
  let shouldUseDarkMode = false;
  if (theme === 'dark') {
    shouldUseDarkMode = true;
  } else if (theme === 'light') {
    shouldUseDarkMode = false;
  } else if (theme === 'system') {
    shouldUseDarkMode = getRenderHostInstance().shouldUseDarkColors();
  }
  (
    document.getElementById('flipper-theme-import') as HTMLLinkElement
  ).href = `themes/${shouldUseDarkMode ? 'dark' : 'light'}.css`;
  getRenderHostInstance().sendIpcEvent('setTheme', theme);
}
