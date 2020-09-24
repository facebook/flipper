/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {useStore} from '../utils/useStore';

// Exposes all the variables defined in themes/base.less:

export const theme = {
  primaryColor: 'var(--flipper-primary-color)',
  successColor: 'var(--flipper-success-color)',
  errorColor: 'var(--flipper-error-color)',
  warningColor: 'var(--flipper-warning-color)',
  textColorPrimary: 'var(--flipper-text-color-primary)',
  textColorSecondary: 'var(--flipper-text-color-secondary)',
  textColorPlaceholder: 'var(--flipper-text-color-placeholder)',
  disabledColor: 'var(--flipper-disabled-color)',
  backgroundDefault: 'var(--flipper-background-default)',
  backgroundWash: 'var(--flipper-background-wash)',
  backgroundTransparentHover: 'var(--flipper-background-transparent-hover)',
  dividerColor: 'var(--flipper-divider-color)',
  borderRadius: 'var(--flipper-border-radius)',
  space: {
    // from Space component in Ant
    small: 8,
    middle: 16,
    large: 24,
  } as const,
  fontSize: {
    smallBody: '12px',
  },
};

/**
 * This hook returns whether dark mode is currently being used.
 * Generally should be avoided in favor of using the above theme object,
 * which will provide colors that reflect the theme
 */
export function useIsDarkMode(): boolean {
  return useStore(
    (state) => state.settingsState.enableSandy && state.settingsState.darkMode,
  );
}
