/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Settings} from 'flipper-common';
import {shouldUseDarkMode} from './useIsDarkMode';

export function loadTheme(theme: Settings['darkMode']) {
  (document.getElementById('flipper-theme-import') as HTMLLinkElement).href =
    `themes/${shouldUseDarkMode(theme) ? 'dark' : 'light'}.css`;
}
