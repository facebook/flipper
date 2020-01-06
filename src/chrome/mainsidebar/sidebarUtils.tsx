/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlexBox, colors, Text, Glyph, styled, FlipperPlugin} from 'flipper';
import React from 'react';
import {StaticView} from '../../reducers/connections';
import {BackgroundColorProperty} from 'csstype';

export type FlipperPlugins = typeof FlipperPlugin[];
export type PluginsByCategory = [string, FlipperPlugins][];

export const ListItem = styled.div<{active?: boolean}>(({active}) => ({
  paddingLeft: 10,
  display: 'flex',
  alignItems: 'center',
  marginBottom: 6,
  flexShrink: 0,
  backgroundColor: active ? colors.macOSTitleBarIconSelected : 'none',
  color: active ? colors.white : colors.macOSSidebarSectionItem,
  lineHeight: '25px',
  padding: '0 10px',
  '&[disabled]': {
    color: 'rgba(0, 0, 0, 0.5)',
  },
}));

export function PluginIcon({
  isActive,
  backgroundColor,
  name,
  color,
}: {
  isActive: boolean;
  backgroundColor?: string;
  name: string;
  color: string;
}) {
  return (
    <PluginShape backgroundColor={backgroundColor}>
      <Glyph size={12} name={name} color={isActive ? colors.white : color} />
    </PluginShape>
  );
}

export const PluginShape = styled(FlexBox)<{
  backgroundColor?: BackgroundColorProperty;
}>(({backgroundColor}) => ({
  marginRight: 8,
  backgroundColor,
  borderRadius: 3,
  flexShrink: 0,
  width: 18,
  height: 18,
  justifyContent: 'center',
  alignItems: 'center',
  top: '-1px',
}));

export const PluginName = styled(Text)<{isActive?: boolean; count?: number}>(
  props => ({
    minWidth: 0,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexGrow: 1,
    '::after': {
      fontSize: 12,
      display: props.count ? 'inline-block' : 'none',
      padding: '0 8px',
      lineHeight: '17px',
      height: 17,
      alignSelf: 'center',
      content: `"${props.count}"`,
      borderRadius: '999em',
      color: props.isActive ? colors.macOSTitleBarIconSelected : colors.white,
      backgroundColor: props.isActive
        ? colors.white
        : colors.macOSTitleBarIconSelected,
      fontWeight: 500,
    },
  }),
);

export function isStaticViewActive(
  current: StaticView,
  selected: StaticView,
): boolean {
  return current && selected && current === selected;
}
