/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {cloneElement, useState, useCallback, useMemo} from 'react';
import {Button, Divider, Badge, Tooltip, Avatar, Popover, Menu} from 'antd';
import {
  MobileFilled,
  AppstoreOutlined,
  BellOutlined,
  FileExclamationOutlined,
  LoginOutlined,
  SettingOutlined,
  MedicineBoxOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import {SidebarLeft, SidebarRight} from './SandyIcons';
import {useDispatch, useStore} from '../utils/useStore';
import {
  toggleLeftSidebarVisible,
  toggleRightSidebarVisible,
} from '../reducers/application';
import {
  theme,
  Layout,
  withTrackingScope,
  Dialog,
  useTrackedCallback,
  NUX,
} from 'flipper-plugin';
import SetupDoctorScreen, {checkHasNewProblem} from './SetupDoctorScreen';
import SettingsSheet from '../chrome/SettingsSheet';
import WelcomeScreen from './WelcomeScreen';
import {errorCounterAtom} from '../chrome/ConsoleLogs';
import {ToplevelProps} from './SandyApp';
import {useValue} from 'flipper-plugin';
import {logout} from '../reducers/user';
import config from '../fb-stubs/config';
import styled from '@emotion/styled';
import {showEmulatorLauncher} from './appinspect/LaunchEmulator';
import SupportRequestFormV2 from '../fb-stubs/SupportRequestFormV2';
import {setStaticView} from '../reducers/connections';
import {getLogger} from 'flipper-common';
import {SandyRatingButton} from '../chrome/RatingButton';
import {filterNotifications} from './notification/notificationUtils';
import {useMemoize} from 'flipper-plugin';
import isProduction from '../utils/isProduction';
import NetworkGraph from '../chrome/NetworkGraph';
import FpsGraph from '../chrome/FpsGraph';
import UpdateIndicator from '../chrome/UpdateIndicator';
import PluginManager from '../chrome/plugin-manager/PluginManager';
import {showLoginDialog} from '../chrome/fb-stubs/SignInSheet';
import SubMenu from 'antd/lib/menu/SubMenu';
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
import {getRenderHostInstance} from '../RenderHost';
import openSupportRequestForm from '../fb-stubs/openSupportRequestForm';

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

export const LeftRail = withTrackingScope(function LeftRail({
  toplevelSelection,
  setToplevelSelection,
}: ToplevelProps) {
  return (
    <Layout.Container borderRight padv={12} width={48}>
      <Layout.Bottom style={{overflow: 'visible'}}>
        <Layout.Container center gap={10} padh={6}>
          <LeftRailButton
            icon={<MobileFilled />}
            title="App Inspect"
            selected={toplevelSelection === 'appinspect'}
            onClick={() => {
              setToplevelSelection('appinspect');
            }}
          />
          <LeftRailButton
            icon={<AppstoreOutlined />}
            title="Plugin Manager"
            onClick={() => {
              Dialog.showModal((onHide) => <PluginManager onHide={onHide} />);
            }}
          />
          <NotificationButton
            toplevelSelection={toplevelSelection}
            setToplevelSelection={setToplevelSelection}
          />
          <LeftRailDivider />
          <DebugLogsButton
            toplevelSelection={toplevelSelection}
            setToplevelSelection={setToplevelSelection}
          />
        </Layout.Container>
        <Layout.Container center gap={10} padh={6}>
          {!isProduction() && (
            <div>
              <FpsGraph />
              <NetworkGraph />
            </div>
          )}
          <UpdateIndicator />
          <SandyRatingButton />
          <LaunchEmulatorButton />
          <SetupDoctorButton />
          <RightSidebarToggleButton />
          <LeftSidebarToggleButton />
          <ExtrasMenu />
          {config.showLogin && <LoginButton />}
        </Layout.Container>
      </Layout.Bottom>
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

const MenuDividerPadded = styled(Menu.Divider)({
  marginBottom: '8px !important',
});

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

  const fullState = useStore((state) => state);

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
          <SubMenu
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
            <Menu.Item
              key="triggerDeeplink"
              onClick={() => openDeeplinkDialog(store)}>
              Trigger deeplink
            </Menu.Item>
            {config.isFBBuild ? (
              <>
                <MenuDividerPadded />
                <Menu.Item
                  key="feedback"
                  onClick={() => {
                    getLogger().track('usage', 'support-form-source', {
                      source: 'sidebar',
                      group: undefined,
                    });
                    if (
                      getRenderHostInstance().GK('flipper_support_entry_point')
                    ) {
                      openSupportRequestForm(fullState);
                    } else {
                      store.dispatch(setStaticView(SupportRequestFormV2));
                    }
                  }}>
                  Feedback
                </Menu.Item>
              </>
            ) : null}
            <MenuDividerPadded />
            <Menu.Item key="settings" onClick={() => setShowSettings(true)}>
              Settings
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item key="help" onClick={() => setWelcomeVisible(true)}>
              Help
            </Menu.Item>
          </SubMenu>
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

function LeftSidebarToggleButton() {
  const dispatch = useDispatch();
  const mainMenuVisible = useStore(
    (state) => state.application.leftSidebarVisible,
  );

  return (
    <LeftRailButton
      icon={<SidebarLeft />}
      small
      title="Left Sidebar Toggle"
      toggled={mainMenuVisible}
      onClick={() => {
        dispatch(toggleLeftSidebarVisible());
      }}
    />
  );
}

function RightSidebarToggleButton() {
  const dispatch = useDispatch();
  const rightSidebarAvailable = useStore(
    (state) => state.application.rightSidebarAvailable,
  );
  const rightSidebarVisible = useStore(
    (state) => state.application.rightSidebarVisible,
  );

  return (
    <LeftRailButton
      icon={<SidebarRight />}
      small
      title="Right Sidebar Toggle"
      toggled={rightSidebarVisible}
      disabled={!rightSidebarAvailable}
      onClick={() => {
        dispatch(toggleRightSidebarVisible());
      }}
    />
  );
}

function NotificationButton({
  toplevelSelection,
  setToplevelSelection,
}: ToplevelProps) {
  const notifications = useStore((state) => state.notifications);
  const activeNotifications = useMemoize(filterNotifications, [
    notifications.activeNotifications,
    notifications.blocklistedPlugins,
    notifications.blocklistedCategories,
  ]);
  return (
    <LeftRailButton
      icon={<BellOutlined />}
      title="Notifications"
      selected={toplevelSelection === 'notification'}
      count={activeNotifications.length}
      onClick={() => setToplevelSelection('notification')}
    />
  );
}

function DebugLogsButton({
  toplevelSelection,
  setToplevelSelection,
}: ToplevelProps) {
  const errorCount = useValue(errorCounterAtom);
  return (
    <LeftRailButton
      icon={<FileExclamationOutlined />}
      title="Flipper Logs"
      selected={toplevelSelection === 'flipperlogs'}
      count={errorCount}
      onClick={() => {
        setToplevelSelection('flipperlogs');
      }}
    />
  );
}

function LaunchEmulatorButton() {
  const store = useStore();

  return (
    <LeftRailButton
      icon={<RocketOutlined />}
      title="Start Emulator / Simulator"
      onClick={() => {
        showEmulatorLauncher(store);
      }}
      small
    />
  );
}

function SetupDoctorButton() {
  const [visible, setVisible] = useState(false);
  const result = useStore(
    (state) => state.healthchecks.healthcheckReport.result,
  );
  const hasNewProblem = useMemo(() => checkHasNewProblem(result), [result]);
  const onClose = useCallback(() => setVisible(false), []);
  return (
    <>
      <LeftRailButton
        icon={<MedicineBoxOutlined />}
        small
        title="Setup Doctor"
        count={hasNewProblem ? true : undefined}
        onClick={() => setVisible(true)}
      />
      <SetupDoctorScreen visible={visible} onClose={onClose} />
    </>
  );
}

function LoginButton() {
  const dispatch = useDispatch();
  const user = useStore((state) => state.user);
  const login = (user?.id ?? null) !== null;
  const profileUrl = user?.profile_picture?.uri;
  const [showLogout, setShowLogout] = useState(false);
  const onHandleVisibleChange = useCallback(
    (visible) => setShowLogout(visible),
    [],
  );

  return login ? (
    <Popover
      content={
        <Button
          block
          style={{backgroundColor: theme.backgroundDefault}}
          onClick={() => {
            onHandleVisibleChange(false);
            dispatch(logout());
          }}>
          Log Out
        </Button>
      }
      trigger="click"
      placement="right"
      visible={showLogout}
      overlayStyle={{padding: 0}}
      onVisibleChange={onHandleVisibleChange}>
      <Layout.Container padv={theme.inlinePaddingV}>
        <Avatar size="small" src={profileUrl} />
      </Layout.Container>
    </Popover>
  ) : (
    <>
      <LeftRailButton
        icon={<LoginOutlined />}
        title="Log In"
        onClick={() => showLoginDialog()}
      />
    </>
  );
}
