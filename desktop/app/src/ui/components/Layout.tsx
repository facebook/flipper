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
  padded?: boolean;
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

const ScrollParent = styled.div({
  flex: 1,
  position: 'relative',
  overflow: 'auto',
});

const ScrollChild = styled.div({
  position: 'absolute',
  minHeight: '100%',
  minWidth: '100%',
});

const ScrollContainer = ({
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) =>
  (
    <ScrollParent {...rest}>
      <ScrollChild>{children}</ScrollChild>
    </ScrollParent>
  ) as any;

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
      <SandySplitContainer
        {...props}
        flexDirection="column"
        flex1={0}
        flex2={1}>
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
      <SandySplitContainer
        {...props}
        flexDirection="column"
        flex1={1}
        flex2={0}>
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
      <SandySplitContainer {...props} flexDirection="row" flex1={0} flex2={1}>
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
      <SandySplitContainer {...props} flexDirection="row" flex1={1} flex2={0}>
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
  flex1: number;
  flex2: number;
  flexDirection: CSSProperties['flexDirection'];
}>((props) => ({
  display: 'flex',
  flex: 1,
  flexDirection: props.flexDirection,
  alignItems: 'stretch',
  '> :first-child': {
    flexGrow: props.flex1,
    flexShrink: props.flex1,
  },
  '> :last-child': {
    flexGrow: props.flex2,
    flexShrink: props.flex2,
  },
}));

export default Layout;
