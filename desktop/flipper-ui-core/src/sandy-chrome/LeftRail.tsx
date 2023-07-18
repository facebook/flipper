/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {cloneElement, useState, useCallback} from 'react';
import {Button, Divider, Badge, Tooltip, Menu} from 'antd';
import {SettingOutlined} from '@ant-design/icons';
import {useStore} from '../utils/useStore';
import {
  theme,
  Layout,
  withTrackingScope,
  useTrackedCallback,
  NUX,
} from 'flipper-plugin';
import SettingsSheet from '../chrome/SettingsSheet';
import WelcomeScreen from './WelcomeScreen';
import styled from '@emotion/styled';
import {setStaticView} from '../reducers/connections';
import {SandyRatingButton} from '../chrome/RatingButton';
import UpdateIndicator from '../chrome/UpdateIndicator';
import constants from '../fb-stubs/constants';
import {
  canFileExport,
  canOpenDialog,
  showOpenDialog,
  startFileExport,
  startLinkExport,
} from '../utils/exportData';
import {openDeeplinkDialog} from '../deeplink';
import {css} from '@emotion/css';
import {getRenderHostInstance} from 'flipper-frontend-core';
import {StyleGuide} from './StyleGuide';

const LeftRailButtonElem = styled(Button)<{kind?: 'small'}>(({kind}) => ({
  width: kind === 'small' ? 32 : 36,
  height: kind === 'small' ? 32 : 36,
  padding: '5px 0',
  border: 'none',
  boxShadow: 'none',
}));
LeftRailButtonElem.displayName = 'LeftRailButtonElem';

export function LeftRailButton({
  icon,
  small,
  selected,
  toggled,
  count,
  title,
  onClick,
  disabled,
}: {
  icon?: React.ReactElement;
  small?: boolean;
  toggled?: boolean;
  selected?: boolean;
  disabled?: boolean;
  count?: number | true;
  title?: string;
  onClick?: React.MouseEventHandler<HTMLElement>;
}) {
  const iconElement =
    icon && cloneElement(icon, {style: {fontSize: small ? 16 : 24}});

  let res = (
    <LeftRailButtonElem
      title={title}
      kind={small ? 'small' : undefined}
      type={selected ? 'primary' : 'ghost'}
      icon={iconElement}
      onClick={onClick}
      disabled={disabled}
      style={{
        color: toggled ? theme.primaryColor : undefined,
        background: toggled ? theme.backgroundWash : undefined,
      }}
    />
  );

  if (count !== undefined) {
    res =
      count === true ? (
        <Badge dot offset={[-8, 8]} {...{onClick}}>
          {res}
        </Badge>
      ) : (
        <Badge count={count} offset={[-6, 5]} {...{onClick}}>
          {res}
        </Badge>
      );
  }

  if (title) {
    res = (
      <Tooltip title={title} placement="right">
        {res}
      </Tooltip>
    );
  }

  return res;
}

const LeftRailDivider = styled(Divider)({
  margin: `10px 0`,
  width: 32,
  minWidth: 32,
});
LeftRailDivider.displayName = 'LeftRailDividier';

export const LeftRail = withTrackingScope(function LeftRail() {
  return (
    <Layout.Container
      borderRight
      borderTop
      padv={12}
      width={48}
      style={{background: theme.backgroundDefault}}>
      <Layout.Container center gap={10} padh={6}>
        <UpdateIndicator />
        <SandyRatingButton />
        <ExtrasMenu />
      </Layout.Container>
    </Layout.Container>
  );
});

const menu = css`
  border: none;
`;
const submenu = css`
  .ant-menu-submenu-title {
    width: 32px;
    height: 32px !important;
    line-height: 32px !important;
    padding: 0;
    margin: 0;
  }
  .ant-menu-submenu-arrow {
    display: none;
  }
`;

function ExtrasMenu() {
  const store = useStore();

  const startFileExportTracked = useTrackedCallback(
    'File export',
    () => startFileExport(store.dispatch),
    [store.dispatch],
  );
  const startLinkExportTracked = useTrackedCallback(
    'Link export',
    () => startLinkExport(store.dispatch),
    [store.dispatch],
  );
  const startImportTracked = useTrackedCallback(
    'File import',
    () => showOpenDialog(store),
    [store],
  );

  const [showSettings, setShowSettings] = useState(false);
  const onSettingsClose = useCallback(() => setShowSettings(false), []);

  const settings = useStore((state) => state.settingsState);
  const {showWelcomeAtStartup} = settings;
  const [welcomeVisible, setWelcomeVisible] = useState(showWelcomeAtStartup);

  return (
    <>
      <NUX
        title="Find import, export, deeplink, feedback, settings, and help (welcome) here"
        placement="right">
        <Menu
          mode="vertical"
          className={menu}
          selectable={false}
          style={{backgroundColor: theme.backgroundDefault}}>
          <Menu.SubMenu
            popupOffset={[10, 0]}
            key="extras"
            title={<LeftRailButton icon={<SettingOutlined />} small />}
            className={submenu}>
            {canOpenDialog() ? (
              <Menu.Item key="importFlipperFile" onClick={startImportTracked}>
                Import Flipper file
              </Menu.Item>
            ) : null}
            {canFileExport() ? (
              <Menu.Item key="exportFile" onClick={startFileExportTracked}>
                Export Flipper file
              </Menu.Item>
            ) : null}
            {constants.ENABLE_SHAREABLE_LINK ? (
              <Menu.Item
                key="exportShareableLink"
                onClick={startLinkExportTracked}>
                Export shareable link
              </Menu.Item>
            ) : null}
            <Menu.Divider />
            <Menu.SubMenu title="Plugin developers">
              <Menu.Item
                key="styleguide"
                onClick={() => {
                  store.dispatch(setStaticView(StyleGuide));
                }}>
                Flipper Style Guide
              </Menu.Item>
              <Menu.Item
                key="triggerDeeplink"
                onClick={() => openDeeplinkDialog(store)}>
                Trigger deeplink
              </Menu.Item>
            </Menu.SubMenu>
            <Menu.Divider />
            <Menu.Item key="settings" onClick={() => setShowSettings(true)}>
              Settings
            </Menu.Item>
            <Menu.Item key="help" onClick={() => setWelcomeVisible(true)}>
              Help
            </Menu.Item>
          </Menu.SubMenu>
        </Menu>
      </NUX>
      {showSettings && (
        <SettingsSheet
          platform={
            getRenderHostInstance().serverConfig.environmentInfo.os.platform
          }
          onHide={onSettingsClose}
        />
      )}
      <WelcomeScreen
        visible={welcomeVisible}
        onClose={() => setWelcomeVisible(false)}
        showAtStartup={showWelcomeAtStartup}
        onCheck={(value) =>
          store.dispatch({
            type: 'UPDATE_SETTINGS',
            payload: {...settings, showWelcomeAtStartup: value},
          })
        }
      />
    </>
  );
}
