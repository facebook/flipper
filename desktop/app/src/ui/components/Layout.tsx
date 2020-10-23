/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {CSSProperties} from 'react';
import styled from '@emotion/styled';
import {
  normalizePadding,
  normalizeSpace,
  PaddingProps,
  Spacing,
  theme,
} from '../../sandy-chrome/theme';
import {useIsSandy} from '../../sandy-chrome/SandyContext';
import {renderLayout} from './LegacyLayout';

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

type DistributionProps = ContainerProps & {
  /**
   * Gab between individual items
   */
  gap?: Spacing;
  /**
   * If set, items will be aligned in the center, if false (the default) items will be stretched.
   */
  center?: boolean;
};

function distributionStyle({gap, center}: DistributionProps) {
  return {
    gap: normalizeSpace(gap, theme.space.small),
    alignItems: center ? 'center' : 'stretch',
  };
}

const Horizontal = styled(Container)<DistributionProps>((props) => ({
  ...distributionStyle(props),
  flexDirection: 'row',
}));

const Vertical = styled(Container)<DistributionProps>((props) => ({
  ...distributionStyle(props),
  flexDirection: 'column',
}));

const ScrollParent = styled.div<{axis?: ScrollAxis}>(({axis}) => ({
  flex: 1,
  boxSizing: 'border-box',
  position: 'relative',
  overflowX: axis === 'y' ? 'hidden' : 'auto',
  overflowY: axis === 'x' ? 'hidden' : 'auto',
}));

const ScrollChild = styled(Vertical)<{axis?: ScrollAxis}>(({axis}) => ({
  position: 'absolute',
  minHeight: '100%',
  minWidth: '100%',
  maxWidth: axis === 'y' ? '100%' : undefined,
  maxHeight: axis === 'x' ? '100%' : undefined,
}));

type ScrollAxis = 'x' | 'y' | 'both';

const ScrollContainer = ({
  children,
  horizontal,
  vertical,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & {
  horizontal?: boolean;
  vertical?: boolean;
}) => {
  const axis =
    horizontal && !vertical ? 'x' : !horizontal && vertical ? 'y' : 'both';
  return (
    <ScrollParent axis={axis} {...rest}>
      <ScrollChild axis={axis}>{children}</ScrollChild>
    </ScrollParent>
  ) as any;
};

type SplitLayoutProps = {
  /**
   * If set, the dynamically sized pane will get scrollbars when needed
   */
  scrollable?: boolean;
  /**
   * If set, items will be centered over the orthogonal direction, if false (the default) items will be stretched.
   */
  center?: boolean;
  children: [React.ReactNode, React.ReactNode];
};

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
const Layout = {
  Top(props: SplitLayoutProps) {
    const isSandy = useIsSandy();
    if (!isSandy) return renderLayout(props, false, false);
    let [child1, child2] = props.children;
    if (props.scrollable) child2 = <ScrollContainer>{child2}</ScrollContainer>;
    return (
      <SandySplitContainer {...props} flexDirection="column" grow={2}>
        {child1}
        {child2}
      </SandySplitContainer>
    );
  },
  Bottom(props: SplitLayoutProps) {
    const isSandy = useIsSandy();
    if (!isSandy) return renderLayout(props, false, true);
    let [child1, child2] = props.children;
    if (props.scrollable) child1 = <ScrollContainer>{child1}</ScrollContainer>;
    return (
      <SandySplitContainer {...props} flexDirection="column" grow={1}>
        {child1}
        {child2}
      </SandySplitContainer>
    );
  },
  Left(props: SplitLayoutProps) {
    const isSandy = useIsSandy();
    if (!isSandy) return renderLayout(props, true, false);
    let [child1, child2] = props.children;
    if (props.scrollable) child2 = <ScrollContainer>{child2}</ScrollContainer>;
    return (
      <SandySplitContainer {...props} flexDirection="row" grow={2}>
        {child1}
        {child2}
      </SandySplitContainer>
    );
  },
  Right(props: SplitLayoutProps) {
    const isSandy = useIsSandy();
    if (!isSandy) return renderLayout(props, true, true);
    let [child1, child2] = props.children;
    if (props.scrollable) child1 = <ScrollContainer>{child1}</ScrollContainer>;
    return (
      <SandySplitContainer {...props} flexDirection="row" grow={1}>
        {child1}
        {child2}
      </SandySplitContainer>
    );
  },
  Container,
  ScrollContainer,
  Horizontal,
  Vertical,
};

Object.keys(Layout).forEach((key) => {
  (Layout as any)[key].displayName = `Layout.${key}`;
});

const SandySplitContainer = styled.div<{
  grow: 1 | 2;
  center?: boolean;
  flexDirection: CSSProperties['flexDirection'];
}>((props) => ({
  boxSizing: 'border-box',
  display: 'flex',
  flex: 1,
  flexDirection: props.flexDirection,
  alignItems: props.center ? 'center' : 'stretch',
  overflow: 'hidden',
  '> :nth-child(1)': {
    flex: props.grow === 1 ? growStyle : fixedStyle,
  },
  '> :nth-child(2)': {
    flex: props.grow === 2 ? growStyle : fixedStyle,
  },
}));

const fixedStyle = `0 0 auto`;
const growStyle = `1 0 0`;

export default Layout;
