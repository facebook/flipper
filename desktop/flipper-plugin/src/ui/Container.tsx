/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import styled from '@emotion/styled';
import {
  normalizePadding,
  normalizeSpace,
  PaddingProps,
  Spacing,
  theme,
} from './theme';

type ContainerProps = {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  borderBottom?: boolean;
  borderTop?: boolean;
  borderRight?: boolean;
  borderLeft?: boolean;
  bordered?: boolean;
  rounded?: boolean;
  width?: number;
  height?: number;
  // grow to available space?
  grow?: boolean;
  // allow shrinking beyond minally needed size? Makes using ellipsis on children possible
  shrink?: boolean;
  /**
   * Gab between individual items
   */
  gap?: Spacing;
  /**
   * If set, items will be aligned in the center, if false (the default) items will be stretched.
   */
  center?: boolean;
} & PaddingProps;

export const Container = styled.div<ContainerProps>(
  ({
    bordered,
    borderBottom,
    borderLeft,
    borderRight,
    borderTop,
    rounded,
    width,
    height,
    grow,
    shrink,
    gap,
    center,
    ...rest
  }) => ({
    display: 'flex',
    flexDirection: 'column',
    flex:
      grow && shrink
        ? `1 1 0` // allow growing, and shrinking smaller than actual size
        : grow
          ? `1 0 auto` // allow grow, start at natural size
          : shrink
            ? `0 1 0` // allow shrinking smaller than natural size
            : `0 0 auto`, // (default) use natural size, don't grow or shrink (in parent flex direction)
    alignItems: center ? 'center' : 'stretch',
    gap: normalizeSpace(gap, theme.space.small),

    minWidth: shrink ? 0 : undefined,
    maxWidth: shrink ? '100%' : undefined,
    boxSizing: 'border-box',
    width,
    height,
    padding: normalizePadding(rest),
    borderRadius: rounded ? theme.containerBorderRadius : undefined,
    borderStyle: 'solid',
    borderColor: theme.dividerColor,
    borderWidth: bordered
      ? 1
      : `${borderTop ? 1 : 0}px ${borderRight ? 1 : 0}px ${
          borderBottom ? 1 : 0
        }px ${borderLeft ? 1 : 0}px`,
  }),
);
