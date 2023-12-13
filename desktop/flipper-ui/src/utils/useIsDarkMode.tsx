/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {useStore} from './useStore';
import {Settings} from 'flipper-common';

export function shouldUseDarkMode(theme: Settings['darkMode']) {
  let shouldUseDarkMode = false;
  if (theme === 'dark') {
    shouldUseDarkMode = true;
  } else if (theme === 'light') {
    shouldUseDarkMode = false;
  } else if (theme === 'system') {
    shouldUseDarkMode = !!(
      window.flipperConfig.theme === 'dark' ||
      (window.flipperConfig.theme === 'system' &&
        window.matchMedia?.('(prefers-color-scheme: dark)'))
    );
  }

  return shouldUseDarkMode;
}

/**
 * This hook returns whether dark mode is currently being used.
 * Generally should be avoided in favor of using the above theme object,
 * which will provide colors that reflect the theme
 */
export function useIsDarkMode(): boolean {
  const darkMode = useStore((state) => state.settingsState.darkMode);
  return shouldUseDarkMode(darkMode);
}
