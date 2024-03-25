/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {Badge, Tooltip, Typography, Button} from 'antd';
import styled from '@emotion/styled';
import reactElementToJSXString from 'react-element-to-jsx-string';
import {SandyPluginContext} from '../plugin/PluginContext';
import {createState, useValue} from '../state/atom';
import {Layout} from './Layout';
import {BulbTwoTone} from '@ant-design/icons';
// This import is OK since it is a type-only import
// eslint-disable-next-line no-restricted-imports
import type {TooltipPlacement} from 'antd/lib/tooltip';
import {theme} from './theme';
import {Tracked} from './Tracked';
import {sha256} from '../utils/sha256';
import {SandyDevicePluginInstance} from '../plugin/DevicePlugin';
import {SandyPluginInstance} from '../plugin/Plugin';

const {Text} = Typography;

type NuxManager = ReturnType<typeof createNuxManager>;

const storageKey = `FLIPPER_NUX_STATE`;

export async function getNuxKey(
  elem: React.ReactNode,
  currentPlugin?: SandyPluginInstance | SandyDevicePluginInstance,
): Promise<string> {
  const hash = await sha256(reactElementToJSXString(elem));
  return `${currentPlugin?.definition.id ?? 'flipper'}:${hash}`;
}

export function createNuxManager() {
  const ticker = createState(0);

  let readMap: Record<string, boolean> = JSON.parse(
    window.localStorage.getItem(storageKey) || '{}',
  );

  function save() {
    // trigger all Nux Elements to re-compute state
    ticker.set(ticker.get() + 1);
    window.localStorage.setItem(storageKey, JSON.stringify(readMap, null, 2));
  }

  return {
    async markRead(
      elem: React.ReactNode,
      currentPlugin?: SandyPluginInstance | SandyDevicePluginInstance,
    ): Promise<void> {
      readMap[await getNuxKey(elem, currentPlugin)] = true;
      save();
    },
    async isRead(
      elem: React.ReactNode,
      currentPlugin?: SandyPluginInstance | SandyDevicePluginInstance,
    ): Promise<boolean> {
      return !!readMap[await getNuxKey(elem, currentPlugin)];
    },
    resetHints(): void {
      readMap = {};
      save();
    },
    ticker,
  };
}

const stubManager: NuxManager = {
  async markRead() {},
  async isRead() {
    return true;
  },
  resetHints() {},
  ticker: createState(0),
};

export const NuxManagerContext = createContext<NuxManager>(stubManager);

/**
 * Creates a New-User-eXperience element; a lightbulb that will show the user new features
 */
export function NUX({
  children,
  title,
  placement,
}: {
  children: React.ReactNode;
  title: string;
  placement?: TooltipPlacement;
}) {
  const manager = useContext(NuxManagerContext);
  const pluginInstance = useContext(SandyPluginContext);
  // changing the ticker will force `isRead` to be recomputed
  const _tick = useValue(manager.ticker);
  // start with Read = true until proven otherwise, to avoid Nux glitches
  const [isRead, setIsRead] = useState(true);

  useEffect(() => {
    manager
      .isRead(title, pluginInstance)
      .then(setIsRead)
      .catch((e) => {
        console.warn('Failed to read NUX status', e);
      });
  }, [manager, title, pluginInstance, _tick]);

  const dismiss = useCallback(() => {
    manager.markRead(title, pluginInstance);
  }, [title, manager, pluginInstance]);

  return (
    <UnanimatedBadge
      count={
        isRead ? (
          0
        ) : (
          <Tooltip
            placement={placement}
            color={theme.backgroundWash}
            title={
              <Layout.Container
                center
                gap
                pad
                style={{color: theme.textColorPrimary}}>
                <BulbTwoTone style={{fontSize: 24}} />
                <Text>{title}</Text>
                <Tracked action={`nux:dismiss:${title.substr(0, 50)}`}>
                  <Button size="small" type="default" onClick={dismiss}>
                    Dismiss
                  </Button>
                </Tracked>
              </Layout.Container>
            }>
            <Pulse />
          </Tooltip>
        )
      }>
      {children}
    </UnanimatedBadge>
  );
}

// We force visibility of the badge to invisible if count has dropped,
// otherwise ANT will await animation end, which looks really awkard, see D24918536
const UnanimatedBadge = styled(Badge)(({count}) => ({
  '.ant-scroll-number-custom-component': {
    visibility: count === 0 ? 'hidden' : undefined,
  },
}));

const Pulse = styled.div({
  cursor: 'pointer',
  background: theme.warningColor,
  opacity: 0.6,
  borderRadius: 20,
  height: 12,
  width: 12,
  ':hover': {
    opacity: `1 !important`,
    background: theme.errorColor,
    animationPlayState: 'paused',
  },
});
