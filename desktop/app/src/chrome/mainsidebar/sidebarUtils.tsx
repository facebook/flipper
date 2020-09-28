/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useRef, useEffect} from 'react';
import {
  FlexBox,
  colors,
  Text,
  Glyph,
  styled,
  FlexColumn,
  ToggleButton,
  brandColors,
  Spacer,
  Heading,
  Client,
  BaseDevice,
  StaticView,
} from 'flipper';
import {BackgroundColorProperty} from 'csstype';
import {getPluginTitle} from '../../utils/pluginUtils';
import {PluginDefinition} from '../../plugin';

export type FlipperPlugins = PluginDefinition[];
export type PluginsByCategory = [string, FlipperPlugins][];

export const ListItem = styled.div<{active?: boolean; disabled?: boolean}>(
  ({active, disabled}) => ({
    paddingLeft: 10,
    display: 'flex',
    alignItems: 'center',
    marginBottom: 6,
    flexShrink: 0,
    backgroundColor: active ? colors.macOSTitleBarIconSelected : 'none',
    color: disabled
      ? 'rgba(0, 0, 0, 0.5)'
      : active
      ? colors.white
      : colors.macOSSidebarSectionItem,
    lineHeight: '25px',
    padding: '0 10px',
    '&[disabled]': {
      color: 'rgba(0, 0, 0, 0.5)',
    },
  }),
);

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

const PluginShape = styled(FlexBox)<{
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
  (props) => ({
    cursor: 'default',
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

export const PluginSidebarListItem: React.FC<{
  onClick: () => void;
  isActive: boolean;
  plugin: PluginDefinition;
  app?: string | null | undefined;
  helpRef?: any;
  provided?: any;
  onFavorite?: () => void;
  starred?: boolean; // undefined means: not starrable
}> = function (props) {
  const {isActive, plugin, onFavorite, starred} = props;
  const iconColor = getColorByApp(props.app);
  const domRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = domRef.current;
    if (isActive && node) {
      const rect = node.getBoundingClientRect();
      if (rect.top < 0 || rect.bottom > document.documentElement.clientHeight) {
        node.scrollIntoView();
      }
    }
  }, [isActive]);

  return (
    <ListItem
      ref={domRef}
      active={isActive}
      onClick={props.onClick}
      disabled={starred === false}>
      <PluginIcon
        isActive={isActive}
        name={plugin.icon || 'apps'}
        backgroundColor={starred === false ? colors.light20 : iconColor}
        color={colors.white}
      />
      <PluginName
        title={`${getPluginTitle(plugin)} ${plugin.version} ${
          plugin.details.description ? '- ' + plugin.details.description : ''
        }`}>
        {getPluginTitle(plugin)}
      </PluginName>
      {starred !== undefined && (!starred || isActive) && (
        <ToggleButton
          onClick={onFavorite}
          toggled={starred}
          tooltip="Click to enable / disable this plugin"
        />
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
  <ListItem style={{marginTop: 8}}>
    <Glyph
      name="mobile-engagement"
      size={16}
      color={colors.red}
      style={{marginRight: 10}}
    />
    No clients connected
  </ListItem>
);

export function getFavoritePlugins(
  device: BaseDevice,
  client: Client,
  allPlugins: FlipperPlugins,
  starredPlugins: undefined | string[],
  returnFavoredPlugins: boolean, // if false, unfavoried plugins are returned
): FlipperPlugins {
  if (device.isArchived) {
    if (!returnFavoredPlugins) {
      return [];
    }
    // for archived plugins, all stored plugins are enabled
    return allPlugins.filter(
      (plugin) => client.plugins.indexOf(plugin.id) !== -1,
    );
  }
  if (!starredPlugins || !starredPlugins.length) {
    return returnFavoredPlugins ? [] : allPlugins;
  }
  return allPlugins.filter((plugin) => {
    const idx = starredPlugins.indexOf(plugin.id);
    return idx === -1 ? !returnFavoredPlugins : returnFavoredPlugins;
  });
}
