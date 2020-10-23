/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {colors} from './colors';
import FlexRow from './FlexRow';
import FlexBox from './FlexBox';
import styled from '@emotion/styled';
import {useIsSandy} from '../../sandy-chrome/SandyContext';
import {theme} from '../../sandy-chrome/theme';
import {Layout} from './Layout';

/**
 * A toolbar.
 */
const ToolbarContainer = styled(FlexRow)<{
  position?: 'bottom' | 'top';
  compact?: boolean;
}>((props) => ({
  userSelect: 'none',
  backgroundColor: colors.light02,
  borderBottom:
    props.position === 'bottom'
      ? 'none'
      : `1px solid ${colors.sectionHeaderBorder}`,
  borderTop:
    props.position === 'bottom'
      ? `1px solid ${colors.sectionHeaderBorder}`
      : 'none',
  flexShrink: 0,
  height: props.compact ? 28 : 42,
  lineHeight: '32px',
  alignItems: 'center',
  padding: 6,
  width: '100%',
}));
ToolbarContainer.displayName = 'ToolbarContainer';

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
  ...rest
}: {
  children?: React.ReactNode;
  position?: 'bottom' | 'top';
  compact?: boolean;
  style?: React.CSSProperties;
}) {
  const isSandy = useIsSandy();
  return isSandy ? (
    <SandyToolbarContainer style={style} gap={theme.space.small} center>
      {children}
    </SandyToolbarContainer>
  ) : (
    <ToolbarContainer style={style} {...rest}>
      {children}
    </ToolbarContainer>
  );
}
