/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {CSSProperties, forwardRef} from 'react';
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

const Container = styled.div<ContainerProps>(
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

const Horizontal = styled(Container)({
  flexDirection: 'row',
});

const ScrollParent = styled.div<{axis?: ScrollAxis}>(({axis}) => ({
  flex: 1,
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

type SplitLayoutProps = {
  /**
   * If set, items will be centered over the orthogonal direction, if false (the default) items will be stretched.
   */
  center?: boolean;
  gap?: Spacing;
  children: [React.ReactNode, React.ReactNode];
  style?: CSSProperties;
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

const Empty = styled.div({width: 0, height: 0});

function renderSplitLayout(
  props: SplitLayoutProps,
  direction: 'column' | 'row',
  grow: 1 | 2,
) {
  let [child1, child2] = props.children;
  // prevent some children to be accidentally omitted if the primary one is `null`
  if (!child1) {
    child1 = <Empty />;
  }
  if (!child2) {
    child2 = <Empty />;
  }
  if ('resizable' in props && props.resizable) {
    const {
      width,
      height,
      minHeight,
      minWidth,
      maxHeight,
      maxWidth,
    } = props as any;
    const sizeProps =
      direction === 'column'
        ? ({
            minHeight,
            height: height ?? 300,
            maxHeight,
          } as const)
        : ({
            minWidth,
            width: width ?? 300,
            maxWidth,
          } as const);
    const Sidebar = require('./Sidebar').Sidebar;
    if (grow === 2) {
      child1 = (
        <Sidebar
          position={direction === 'column' ? 'top' : 'left'}
          {...sizeProps}>
          {child1}
        </Sidebar>
      );
    } else {
      child2 = (
        <Sidebar
          position={direction === 'column' ? 'bottom' : 'right'}
          {...sizeProps}>
          {child2}
        </Sidebar>
      );
    }
  }
  return (
    <SandySplitContainer {...props} flexDirection={direction} grow={grow}>
      {child1}
      {child2}
    </SandySplitContainer>
  );
}

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

const SandySplitContainer = styled.div<{
  grow: 1 | 2;
  gap?: Spacing;
  center?: boolean;
  flexDirection: CSSProperties['flexDirection'];
}>((props) => ({
  boxSizing: 'border-box',
  display: 'flex',
  flex: 1,
  flexDirection: props.flexDirection,
  alignItems: props.center ? 'center' : 'stretch',
  gap: normalizeSpace(props.gap, theme.space.small),
  overflow: props.center ? undefined : 'hidden', // only use overflow hidden in container mode, to avoid weird resizing issues
  '>:nth-child(1)': {
    flex: props.grow === 1 ? splitGrowStyle : splitFixedStyle,
    minWidth: props.grow === 1 ? 0 : undefined,
  },
  '>:nth-child(2)': {
    flex: props.grow === 2 ? splitGrowStyle : splitFixedStyle,
    minWidth: props.grow === 2 ? 0 : undefined,
  },
}));

const splitFixedStyle = `0 0 auto`;
const splitGrowStyle = `1 0 0`;
