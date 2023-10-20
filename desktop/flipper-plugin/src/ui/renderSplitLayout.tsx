/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {CSSProperties} from 'react';
import styled from '@emotion/styled';
import {normalizeSpace, Spacing, theme} from './theme';

import type {SplitLayoutProps} from './Layout';
import {Sidebar} from './Sidebar';

const Empty = styled.div({width: 0, height: 0});

export function renderSplitLayout(
  props: SplitLayoutProps,
  direction: 'column' | 'row',
  grow: 1 | 2,
) {
  let [child1, child2] = props.children;
  // prevent some children to be accidentally omitted if the primary one is `null`
  if (!child1) {
    child1 = <Empty />;
  }
  if (!child2) {
    child2 = <Empty />;
  }
  if ('resizable' in props && props.resizable) {
    const {width, height, minHeight, minWidth, maxHeight, maxWidth} =
      props as any;
    const sizeProps =
      direction === 'column'
        ? ({
            minHeight,
            height: height ?? 300,
            maxHeight,
          } as const)
        : ({
            minWidth,
            width: width ?? 300,
            maxWidth,
          } as const);
    if (grow === 2) {
      child1 = (
        <Sidebar
          position={direction === 'column' ? 'top' : 'left'}
          {...sizeProps}>
          {child1}
        </Sidebar>
      );
    } else {
      child2 = (
        <Sidebar
          position={direction === 'column' ? 'bottom' : 'right'}
          {...sizeProps}>
          {child2}
        </Sidebar>
      );
    }
  }
  return (
    <SandySplitContainer {...props} flexDirection={direction} grow={grow}>
      {child1}
      {child2}
    </SandySplitContainer>
  );
}

const SandySplitContainer = styled.div<{
  grow: 1 | 2;
  gap?: Spacing;
  center?: boolean;
  flexDirection: CSSProperties['flexDirection'];
}>((props) => ({
  boxSizing: 'border-box',
  display: 'flex',
  flex: `1 1 0`,
  flexDirection: props.flexDirection,
  alignItems: props.center ? 'center' : 'stretch',
  gap: normalizeSpace(props.gap, theme.space.small),
  overflow: props.center ? undefined : 'hidden', // only use overflow hidden in container mode, to avoid weird resizing issues
  '>:nth-child(1)': {
    flex: props.grow === 1 ? splitGrowStyle : splitFixedStyle,
    minWidth: props.grow === 1 ? 0 : undefined,
  },
  '>:nth-child(2)': {
    flex: props.grow === 2 ? splitGrowStyle : splitFixedStyle,
    minWidth: props.grow === 2 ? 0 : undefined,
  },
}));

const splitFixedStyle = `0 0 auto`;
const splitGrowStyle = `1 0 0`;
