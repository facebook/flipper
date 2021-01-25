/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import FlexBox from './FlexBox';
import styled from '@emotion/styled';
import {theme, Layout} from 'flipper-plugin';

const SandyToolbarContainer = styled(Layout.Horizontal)({
  flexWrap: 'wrap',
  padding: theme.space.small,
  boxShadow: `inset 0px -1px 0px ${theme.dividerColor}`,
});

export const Spacer = styled(FlexBox)({
  flexGrow: 1,
});
Spacer.displayName = 'Spacer';

export default function Toolbar({
  children,
  style,
}: {
  children?: React.ReactNode;
  position?: 'bottom' | 'top';
  compact?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <SandyToolbarContainer style={style} gap={theme.space.small} center>
      {children}
    </SandyToolbarContainer>
  );
}
