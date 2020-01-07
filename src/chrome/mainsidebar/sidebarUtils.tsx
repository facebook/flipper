/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  FlexBox,
  colors,
  Text,
  Glyph,
  styled,
  FlipperPlugin,
  FlexColumn,
  LoadingIndicator,
  FlipperBasePlugin,
  StarButton,
  brandColors,
  Spacer,
  Heading,
} from 'flipper';
import React, {useState, useCallback} from 'react';
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

export const CategoryName = styled(PluginName)({
  color: colors.macOSSidebarSectionTitle,
  textTransform: 'uppercase',
  fontSize: '0.9em',
});

export const Plugins = styled(FlexColumn)({
  flexGrow: 1,
  overflow: 'auto',
});

export const Spinner = centerInSidebar(LoadingIndicator);

export const ErrorIndicator = centerInSidebar(Glyph);

export function centerInSidebar(component: any) {
  return styled(component)({
    marginTop: '10px',
    marginBottom: '10px',
    marginLeft: 'auto',
    marginRight: 'auto',
  });
}

export const PluginSidebarListItem: React.FC<{
  onClick: () => void;
  isActive: boolean;
  plugin: typeof FlipperBasePlugin;
  app?: string | null | undefined;
  helpRef?: any;
  provided?: any;
  onFavorite?: () => void;
  starred?: boolean;
}> = function(props) {
  const {isActive, plugin, onFavorite, starred} = props;
  const iconColor = getColorByApp(props.app);
  const [hovered, setHovered] = useState(false);

  const onEnter = useCallback(() => setHovered(true), []);
  const onLeave = useCallback(() => setHovered(false), []);

  return (
    <ListItem
      active={isActive}
      onClick={props.onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}>
      <PluginIcon
        isActive={isActive}
        name={plugin.icon || 'apps'}
        backgroundColor={iconColor}
        color={colors.white}
      />
      <PluginName>{plugin.title || plugin.id}</PluginName>
      {starred !== undefined && (hovered || isActive) && (
        <StarButton onStar={onFavorite!} starred={starred} />
      )}
    </ListItem>
  );
};

export function getColorByApp(app?: string | null): string {
  let iconColor: string | undefined = (brandColors as any)[app!];

  if (!iconColor) {
    if (!app) {
      // Device plugin
      iconColor = colors.macOSTitleBarIconBlur;
    } else {
      const pluginColors = [
        colors.seaFoam,
        colors.teal,
        colors.lime,
        colors.lemon,
        colors.orange,
        colors.tomato,
        colors.cherry,
        colors.pink,
        colors.grape,
      ];

      iconColor = pluginColors[parseInt(app, 36) % pluginColors.length];
    }
  }
  return iconColor;
}

export const NoDevices = () => (
  <ListItem
    style={{
      textAlign: 'center',
      marginTop: 50,
      flexDirection: 'column',
    }}>
    <Glyph name="mobile" size={32} color={colors.red}></Glyph>
    <Spacer style={{height: 20}} />
    <Heading>Select a device to get started</Heading>
  </ListItem>
);

export const NoClients = () => (
  <ListItem>
    <Glyph
      name="mobile-engagement"
      size={16}
      color={colors.red}
      style={{marginRight: 10}}
    />
    No clients connected
  </ListItem>
);
