/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {CSSProperties, forwardRef} from 'react';
import styled from '@emotion/styled';
import {Container} from './Container';
import {PaddingProps, Spacing} from './theme';

import {renderSplitLayout} from './renderSplitLayout';

const Horizontal = styled(Container)({
  flexDirection: 'row',
});

const ScrollParent = styled.div<{axis?: ScrollAxis}>(({axis}) => ({
  flex: `1 1 0`,
  boxSizing: 'border-box',
  position: 'relative',
  overflowX: axis === 'y' ? 'hidden' : 'auto',
  overflowY: axis === 'x' ? 'hidden' : 'auto',
}));

const ScrollChild = styled(Container)<{axis?: ScrollAxis}>(({axis}) => ({
  position: 'absolute',
  minHeight: '100%',
  minWidth: '100%',
  maxWidth: axis === 'y' ? '100%' : undefined,
  maxHeight: axis === 'x' ? '100%' : undefined,
}));

type ScrollAxis = 'x' | 'y' | 'both';

const ScrollContainer = forwardRef(
  (
    {
      children,
      horizontal,
      vertical,
      padv,
      padh,
      pad,
      ...rest
    }: React.HTMLAttributes<HTMLDivElement> & {
      horizontal?: boolean;
      vertical?: boolean;
    } & PaddingProps,
    ref: React.ForwardedRef<HTMLDivElement>,
  ) => {
    const axis =
      horizontal && !vertical ? 'x' : !horizontal && vertical ? 'y' : 'both';
    return (
      <ScrollParent axis={axis} {...rest} ref={ref}>
        <ScrollChild axis={axis} padv={padv} padh={padh} pad={pad}>
          {children}
        </ScrollChild>
      </ScrollParent>
    ) as any;
  },
);

export type SplitLayoutProps = {
  /**
   * If set, items will be centered over the orthogonal direction, if false (the default) items will be stretched.
   */
  center?: boolean;
  gap?: Spacing;
  children: [React.ReactNode, React.ReactNode];
  style?: CSSProperties;
  className?: string;
} & SplitHorizontalResizableProps &
  SplitVerticalResizableProps;

type SplitHorizontalResizableProps =
  | {
      resizable: true;
      /**
       * Width describes the width of the resizable pane. To set a global width use the style attribute.
       */
      width?: number;
      minWidth?: number;
      maxWidth?: number;
    }
  | {};

type SplitVerticalResizableProps =
  | {
      resizable: true;
      /**
       * Width describes the width of the resizable pane. To set a global width use the style attribute.
       */
      height?: number;
      minHeight?: number;
      maxHeight?: number;
    }
  | {};

/**
 * The Layout component divides all available screenspace over two components:
 * A fixed top (or left) component, and all remaining space to a bottom component.
 *
 * The main area will be scrollable by default, but if multiple containers are nested,
 * scrolling can be disabled by using `scrollable={false}`
 *
 * If initialSize is set, the fixed container will be made resizable
 *
 * Use Layout.Top / Right / Bottom / Left to indicate where the fixed element should live.
 */
export const Layout = {
  Top(props: SplitLayoutProps & SplitVerticalResizableProps) {
    return renderSplitLayout(props, 'column', 2);
  },
  Bottom(props: SplitLayoutProps & SplitVerticalResizableProps) {
    return renderSplitLayout(props, 'column', 1);
  },
  Left(props: SplitLayoutProps & SplitHorizontalResizableProps) {
    return renderSplitLayout(props, 'row', 2);
  },
  Right(props: SplitLayoutProps & SplitHorizontalResizableProps) {
    return renderSplitLayout(props, 'row', 1);
  },
  Container,
  ScrollContainer,
  Horizontal,
};

Object.keys(Layout).forEach((key) => {
  (Layout as any)[key].displayName = `Layout.${key}`;
});
