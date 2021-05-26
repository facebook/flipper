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
import {Layout} from './Layout';
import {theme} from './theme';

const SandyToolbarContainer = styled(Layout.Horizontal)<{wash?: boolean}>(
  ({wash}) => ({
    flexWrap: 'wrap',
    padding: theme.space.small,
    boxShadow: `inset 0px -1px 0px ${theme.dividerColor}`,
    background: wash ? theme.backgroundWash : undefined,
  }),
);

export function Toolbar({
  children,
  style,
  wash,
  right,
}: {
  children?: React.ReactNode;
  position?: 'bottom' | 'top';
  compact?: boolean;
  wash?: boolean;
  style?: React.CSSProperties;
  /**
   * Additional children that are always right-aligned
   */
  right?: React.ReactNode;
}) {
  return (
    <SandyToolbarContainer
      style={style}
      gap={theme.space.small}
      center
      wash={wash}>
      {children}
      {right ? (
        <>
          <div style={{flexGrow: 1}}></div>
          {right}
        </>
      ) : null}
    </SandyToolbarContainer>
  );
}
