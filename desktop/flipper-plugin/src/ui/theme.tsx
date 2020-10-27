/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

// Exposes all the variables defined in themes/base.less:

export const theme = {
  white: 'white', // use as counter color for primary
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
  buttonDefaultBackground: 'var(--flipper-button-default-background)',
  backgroundTransparentHover: 'var(--flipper-background-transparent-hover)',
  dividerColor: 'var(--flipper-divider-color)',
  borderRadius: 'var(--flipper-border-radius)',
  containerBorderRadius: 8,
  inlinePaddingV: 6, // vertical padding on inline elements like buttons
  inlinePaddingH: 12, // horizontal  ,,,
  space: {
    // from Space component in Ant
    tiny: 4,
    small: 8,
    medium: 12,
    large: 16,
    huge: 24,
  } as const,
  fontSize: {
    smallBody: '12px',
  } as const,
} as const;

export type Spacing = keyof typeof theme['space'] | number | undefined | true;

export type PaddingProps = {
  padv?: Spacing;
  padh?: Spacing;
  pad?: Spacing;
};

export function normalizePadding({
  padv,
  padh,
  pad,
}: PaddingProps): string | undefined {
  if (padv === undefined && padh === undefined && pad === undefined) {
    return undefined;
  }
  return `${normalizeSpace(
    padv ?? pad ?? 0,
    theme.inlinePaddingV,
  )}px ${normalizeSpace(padh ?? pad ?? 0, theme.inlinePaddingH)}px`;
}

export function normalizeSpace(spacing: Spacing, defaultSpace: number): number {
  return spacing === true
    ? defaultSpace
    : spacing === undefined
    ? 0
    : typeof spacing === 'string'
    ? theme.space[spacing]
    : spacing;
}
