/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import * as antColors from '@ant-design/colors';

// Exposes all the variables defined in themes/base.less:
export const theme = {
  white: 'white', // use as counter color for primary
  black: 'black',
  primaryColor: 'var(--flipper-primary-color)',
  successColor: 'var(--flipper-success-color)',
  errorColor: 'var(--flipper-error-color)',
  warningColor: 'var(--flipper-warning-color)',
  textColorPrimary: 'var(--flipper-text-color-primary)',
  textColorSecondary: 'var(--flipper-text-color-secondary)',
  textColorPlaceholder: 'var(--flipper-text-color-placeholder)',
  textColorActive: 'var(--light-color-button-active)',
  searchHighlightBackground: {
    yellow: antColors.yellow[3],
    red: antColors.red[3],
    green: antColors.green[3],
    blue: antColors.blue[3],
  } as const,
  selectionBackgroundColor: 'var(--flipper-primary-background-wash)',
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
    large: '16px',
    default: '14px',
    small: '12px',
    smaller: '10px',
  } as const,
  monospace: {
    fontFamily: 'SF Mono,Monaco,Andale Mono,monospace',
    fontSize: '12px',
  } as const,
  bold: 600,
  semanticColors: {
    attribute: antColors.orange[5],
    nullValue: antColors.grey.primary!,
    stringValue: antColors.orange[5],
    colorValue: antColors.cyan[5],
    booleanValue: antColors.magenta[5],
    numberValue: antColors.blue[5],
    diffAddedBackground: 'var(--flipper-diff-added-background)',
    diffRemovedBackground: 'var(--flipper-diff-removed-background)',
  },
} as const;

export type Spacing =
  | keyof (typeof theme)['space']
  | number
  | undefined
  | boolean;

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
    : spacing === undefined || spacing === false
    ? 0
    : typeof spacing === 'string'
    ? theme.space[spacing]
    : spacing;
}
