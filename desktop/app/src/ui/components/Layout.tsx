/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import styled from '@emotion/styled';

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

const FixedContainer = styled('div')({
  flex: 'none',
  height: 'auto',
  overflow: 'hidden',
});
FixedContainer.displayName = 'Layout:FixedContainer';

const ScrollContainer = styled('div')<{scrollable: boolean}>(
  ({scrollable}) => ({
    overflow: scrollable ? 'auto' : 'hidden',
    flex: 'auto',
    display: 'flex',
  }),
);
ScrollContainer.displayName = 'Layout:ScrollContainer';

const Container = styled('div')<{horizontal: boolean; center?: boolean}>(
  ({horizontal, center}) => ({
    display: 'flex',
    flex: 'auto',
    flexDirection: horizontal ? 'row' : 'column',
    height: '100%',
    width: '100%',
    overflow: 'hidden',
    alignItems: center ? 'center' : undefined,
  }),
);
Container.displayName = 'Layout:Container';

function renderLayout(
  {children, scrollable, center}: SplitLayoutProps,
  horizontal: boolean,
  reverse: boolean,
) {
  if (children.length !== 2) {
    throw new Error('Layout expects exactly 2 children');
  }
  const fixedChild = reverse ? children[1] : children[0];

  const fixedElement = <FixedContainer>{fixedChild}</FixedContainer>;

  const dynamicElement = (
    <ScrollContainer scrollable={!!scrollable}>
      {reverse ? children[0] : children[1]}
    </ScrollContainer>
  );
  return reverse ? (
    <Container horizontal={horizontal} center={center}>
      {dynamicElement}
      {fixedElement}
    </Container>
  ) : (
    <Container horizontal={horizontal} center={center}>
      {fixedElement}
      {dynamicElement}
    </Container>
  );
}

type DistributionProps = {
  /**
   * Gab between individual items
   */
  gap?: number;
  /**
   * If set, items will be aligned in the center, if false (the default) items will be stretched.
   */
  center?: boolean;
  /**
   * If set, the layout will fill out to maximum width
   */
  fillx?: boolean;
  /**
   * If set, the layout will fill out to maximum height
   */
  filly?: boolean;
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
const Layout: Record<
  'Left' | 'Right' | 'Top' | 'Bottom',
  React.FC<SplitLayoutProps>
> &
  Record<'Horizontal' | 'Vertical', React.FC<DistributionProps>> = {
  Top(props) {
    return renderLayout(props, false, false);
  },
  Bottom(props) {
    return renderLayout(props, false, true);
  },
  Left(props) {
    return renderLayout(props, true, false);
  },
  Right(props) {
    return renderLayout(props, true, true);
  },
  Horizontal: styled.div<DistributionProps>(({gap, center, fillx, filly}) => ({
    display: 'flex',
    flexDirection: 'row',
    gap,
    alignItems: center ? 'center' : 'stretch',
    width: fillx ? '100%' : undefined,
    height: filly ? '100%' : undefined,
  })),
  Vertical: styled.div<DistributionProps>(({gap, center, fillx, filly}) => ({
    display: 'flex',
    flexDirection: 'column',
    gap,
    alignItems: center ? 'center' : 'stretch',
    width: fillx ? '100%' : undefined,
    height: filly ? '100%' : undefined,
  })),
};

Object.keys(Layout).forEach((key) => {
  (Layout as any)[key].displayName = `Layout.${key}`;
});

export default Layout;
