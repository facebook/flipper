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

const FixedContainer = styled.div({
  flex: 'none',
  height: 'auto',
  overflow: 'hidden',
});
FixedContainer.displayName = 'Layout:FixedContainer';

const SplitScrollContainer = styled.div<{scrollable: boolean}>(
  ({scrollable}) => ({
    overflow: scrollable ? 'auto' : 'hidden',
    flex: 'auto',
    display: 'flex',
  }),
);
SplitScrollContainer.displayName = 'Layout:SplitScrollContainer';

const SplitContainer = styled.div<{horizontal: boolean; center?: boolean}>(
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
SplitContainer.displayName = 'Layout:SplitContainer';

/**
 * @deprecated use Layout.Top|Left|Right|Bottom instead
 */
export function renderLayout(
  {
    children,
    scrollable,
  }: {scrollable?: boolean; children: [React.ReactNode, React.ReactNode]},
  horizontal: boolean,
  reverse: boolean,
) {
  if (children.length !== 2) {
    throw new Error('Layout expects exactly 2 children');
  }
  const fixedChild = reverse ? children[1] : children[0];

  const fixedElement = <FixedContainer>{fixedChild}</FixedContainer>;

  const dynamicElement = (
    <SplitScrollContainer scrollable={!!scrollable}>
      {reverse ? children[0] : children[1]}
    </SplitScrollContainer>
  );
  return reverse ? (
    <SplitContainer horizontal={horizontal}>
      {dynamicElement}
      {fixedElement}
    </SplitContainer>
  ) : (
    <SplitContainer horizontal={horizontal}>
      {fixedElement}
      {dynamicElement}
    </SplitContainer>
  );
}
