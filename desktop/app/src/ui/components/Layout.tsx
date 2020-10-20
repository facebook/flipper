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
    ...rest
  }) => ({
    boxSizing: 'border-box',
    minWidth: `0`, // ensures the Container can shrink smaller than it's largest
    width,
    height,
    display: 'flex',
    flexDirection: 'column',
    padding: normalizePadding(rest),
    borderRadius: rounded ? theme.containerBorderRadius : undefined,
    flex: 1,
    borderStyle: 'solid',
    borderColor: theme.dividerColor,
    borderWidth: bordered
      ? 1
      : `${borderTop ? 1 : 0}px ${borderRight ? 1 : 0}px ${
          borderBottom ? 1 : 0
        }px ${borderLeft ? 1 : 0}px`,
  }),
);

const ScrollParent = styled.div<{axis?: ScrollAxis}>(({axis}) => ({
  flex: 1,
  boxSizing: 'border-box',
  position: 'relative',
  overflowX: axis === 'y' ? 'hidden' : 'auto',
  overflowY: axis === 'x' ? 'hidden' : 'auto',
}));

const ScrollChild = styled.div<{axis?: ScrollAxis}>(({axis}) => ({
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

const Horizontal = styled(Container)<DistributionProps>(({gap, center}) => ({
  display: 'flex',
  flexDirection: 'row',
  gap: normalizeSpace(gap, theme.space.small),
  alignItems: center ? 'center' : 'stretch',
  minWidth: 'auto', // corrects 0 on Container
}));

const Vertical = styled(Container)<DistributionProps>(({gap, center}) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: normalizeSpace(gap, theme.space.small),
  alignItems: center ? 'center' : 'stretch',
}));

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
  '> :first-child': {
    flex: props.grow === 1 ? growStyle : fixedStyle,
  },
  '> :last-child': {
    flex: props.grow === 2 ? growStyle : fixedStyle,
  },
}));

const fixedStyle = `0 0 auto`;
const growStyle = `1 0 0`;

export default Layout;
