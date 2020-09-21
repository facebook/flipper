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
import {Sidebar} from '..';

type Props = {
  /**
   * If set, the dynamically sized pane will get scrollbars when needed
   */
  scrollable?: boolean;
  /**
   * If set, the 'fixed' child will no longer be sized based on it's own dimensions,
   * but rather it will be possible to resize it
   */
  initialSize?: number;
  minSize?: number;

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

const Container = styled('div')<{horizontal: boolean}>(({horizontal}) => ({
  display: 'flex',
  flex: 'auto',
  flexDirection: horizontal ? 'row' : 'column',
  height: '100%',
  width: '100%',
  overflow: 'hidden',
}));
Container.displayName = 'Layout:Container';

function renderLayout(
  {children, scrollable, initialSize, minSize}: Props,
  horizontal: boolean,
  reverse: boolean,
) {
  if (children.length !== 2) {
    throw new Error('Layout expects exactly 2 children');
  }
  const fixedChild = reverse ? children[1] : children[0];

  const fixedElement =
    initialSize === undefined ? (
      <FixedContainer>{fixedChild}</FixedContainer>
    ) : horizontal ? (
      <Sidebar
        position={reverse ? 'right' : 'left'}
        width={initialSize}
        minWidth={minSize}
        gutter>
        {fixedChild}
      </Sidebar>
    ) : (
      <Sidebar
        position={reverse ? 'bottom' : 'top'}
        height={initialSize}
        minHeight={minSize}
        gutter>
        {fixedChild}
      </Sidebar>
    );
  const dynamicElement = (
    <ScrollContainer scrollable={!!scrollable}>
      {reverse ? children[0] : children[1]}
    </ScrollContainer>
  );
  return reverse ? (
    <Container horizontal={horizontal}>
      {dynamicElement}
      {fixedElement}
    </Container>
  ) : (
    <Container horizontal={horizontal}>
      {fixedElement}
      {dynamicElement}
    </Container>
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
const Layout: Record<'Left' | 'Right' | 'Top' | 'Bottom', React.FC<Props>> = {
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
};

Layout.Top.displayName = 'Layout.Top';
Layout.Left.displayName = 'Layout.Left';
Layout.Bottom.displayName = 'Layout.Bottom';
Layout.Right.displayName = 'Layout.Right';

export default Layout;
