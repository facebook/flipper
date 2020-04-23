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

type Props = {
  scrollable?: boolean;
  horizontal?: boolean;
};

const FixedContainer = styled('div')({
  flex: 'none',
  height: 'auto',
  overflow: 'none',
});
FixedContainer.displayName = 'Layout:FixedContainer';

const ScrollContainer = styled('div')<Props>(({scrollable}) => ({
  overflow: scrollable ? 'auto' : 'hidden',
  flex: 'auto',
  display: 'flex',
}));
ScrollContainer.displayName = 'Layout:ScrollContainer';

const Container = styled('div')<Props>(({horizontal}) => ({
  display: 'flex',
  flex: 'auto',
  flexDirection: horizontal ? 'row' : 'column',
  height: '100%',
  width: '100%',
  overflow: 'hidden',
}));
Container.displayName = 'Layout:Container';

/**
 * The Layout component divides all available screenspace over two components:
 * A fixed top (or left) component, and all remaining space to a bottom component.
 *
 * The main area will be scrollable by default, but if multiple containers are nested,
 * scrolling can be disabled by using `scrollable={false}`
 */
const Layout: React.FC<
  {
    children: [React.ReactNode, React.ReactNode];
  } & Props
> = ({children, ...props}) => {
  if (children.length > 2) {
    throw new Error('VerticalContainer expects exactly 2 children');
  }
  const top = children[0];
  const main = children[1];
  return (
    <Container {...props}>
      <FixedContainer>{top}</FixedContainer>
      <ScrollContainer {...props}>{main}</ScrollContainer>
    </Container>
  );
};

Layout.displayName = 'Layout';
Layout.defaultProps = {
  scrollable: false,
  horizontal: false,
};

export default Layout;
