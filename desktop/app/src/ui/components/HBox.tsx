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
import FlexRow from './FlexRow';

/**
 * Container that applies a standardized right margin for horizontal spacing
 * It takes two children, 'left' and 'right'. One is assumed to have a fixed (or minimum) size,
 * and the other will grow automatically
 */
const HBoxContainer = styled(FlexRow)<{verticalAlign: string}>(
  ({verticalAlign}) => ({
    shrink: 0,
    alignItems: verticalAlign,
  }),
);

HBoxContainer.displayName = 'HBoxContainer';

/**
 * @deprecated use Layout.Left / Layout.Right or Layout.Horizonta from flipper-plugin instead
 */
const HBox: React.FC<{
  children: [] | [React.ReactNode] | [React.ReactNode, React.ReactNode];
  grow?: 'left' | 'right' | 'auto';
  childWidth?: number;
  verticalAlign?: 'center' | 'top';
}> = ({children, grow, childWidth, verticalAlign}) => {
  if (children.length > 2) {
    throw new Error('HBox expects at most 2 children');
  }
  const left = children[0] || null;
  const right = children[1] || null;
  const fixedStyle = {
    width: childWidth ? `${childWidth}px` : 'auto',
    grow: 0,
    shrink: 0,
  };
  const growStyle = {
    flexShrink: 1,
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
  } as const;
  const vAlign = verticalAlign === 'top' ? 'normal' : 'center';

  switch (grow) {
    case 'right':
      return (
        <HBoxContainer verticalAlign={vAlign}>
          <div style={{...fixedStyle, marginRight: 8}}>{left}</div>
          <div style={growStyle}>{right}</div>
        </HBoxContainer>
      );
    case 'left':
      return (
        <HBoxContainer verticalAlign={vAlign}>
          <div style={growStyle}>{left}</div>
          <div style={{...fixedStyle, marginLeft: 8}}>{right}</div>
        </HBoxContainer>
      );
    default:
      return (
        <HBoxContainer verticalAlign={vAlign}>
          <div style={growStyle}>{left}</div>
          <div style={{...growStyle, marginLeft: 8}}>{right}</div>
        </HBoxContainer>
      );
  }
};
HBox.defaultProps = {
  grow: 'right',
  childWidth: 0,
  verticalAlign: 'center',
};

HBox.displayName = 'HBox';

export default HBox;
