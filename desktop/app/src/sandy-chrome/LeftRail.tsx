/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {cloneElement, useState, useCallback} from 'react';
import {styled, Layout} from 'flipper';
import {Button, Divider, Badge, Tooltip, Avatar, Popover} from 'antd';
import {
  MobileFilled,
  AppstoreOutlined,
  BellOutlined,
  FileExclamationOutlined,
  LoginOutlined,
  BugOutlined,
  SettingOutlined,
  QuestionCircleOutlined,
  MedicineBoxOutlined,
} from '@ant-design/icons';
import {SidebarLeft, SidebarRight} from './SandyIcons';
import {useDispatch, useStore} from '../utils/useStore';
import {toggleLeftSidebarVisible} from '../reducers/application';
import {theme} from './theme';
import SettingsSheet from '../chrome/SettingsSheet';
import WelcomeScreen from './WelcomeScreen';
import SignInSheet from '../chrome/SignInSheet';
import {errorCounterAtom} from '../chrome/ConsoleLogs';
import {ToplevelProps} from './SandyApp';
import {useValue} from 'flipper-plugin';
import {logout} from '../reducers/user';
import config from '../fb-stubs/config';

const LeftRailButtonElem = styled(Button)<{kind?: 'small'}>(({kind}) => ({
  width: kind === 'small' ? 32 : 36,
  height: kind === 'small' ? 32 : 36,
  padding: '5px 0',
  border: 'none',
  boxShadow: 'none',
}));
LeftRailButtonElem.displayName = 'LeftRailButtonElem';

function LeftRailButton({
  icon,
  small,
  selected,
  toggled,
  count,
  title,
  onClick,
}: {
  icon?: React.ReactElement;
  small?: boolean;
  toggled?: boolean;
  selected?: boolean; // TODO: make sure only one element can be selected
  count?: number;
  title: string;
  onClick?: React.MouseEventHandler<HTMLElement>;
}) {
  let iconElement =
    icon && cloneElement(icon, {style: {fontSize: small ? 16 : 24}});
  if (count !== undefined) {
    iconElement = <Badge count={count}>{iconElement}</Badge>;
  }
  return (
    <Tooltip title={title} placement="right">
      <LeftRailButtonElem
        kind={small ? 'small' : undefined}
        type={selected ? 'primary' : 'ghost'}
        icon={iconElement}
        onClick={onClick}
        style={{
          color: toggled ? theme.primaryColor : undefined,
          background: toggled ? theme.backgroundWash : undefined,
        }}
      />
    </Tooltip>
  );
}

const LeftRailDivider = styled(Divider)({
  margin: `10px 0`,
  width: 32,
  minWidth: 32,
});
LeftRailDivider.displayName = 'LeftRailDividier';

export function LeftRail({
  toplevelSelection,
  setToplevelSelection,
}: ToplevelProps) {
  return (
    <Layout.Container borderRight padv={12} padh={6} width={48}>
      <Layout.Bottom>
        <Layout.Vertical center gap={10}>
          <LeftRailButton
            icon={<MobileFilled />}
            title="App Inspect"
            selected={toplevelSelection === 'appinspect'}
            onClick={() => {
              setToplevelSelection('appinspect');
            }}
          />
          <LeftRailButton icon={<AppstoreOutlined />} title="Plugin Manager" />
          <LeftRailButton icon={<BellOutlined />} title="Notifications" />
          <LeftRailDivider />
          <DebugLogsButton
            toplevelSelection={toplevelSelection}
            setToplevelSelection={setToplevelSelection}
          />
        </Layout.Vertical>
        <Layout.Vertical center gap={10}>
          <LeftRailButton
            icon={<MedicineBoxOutlined />}
            small
            title="Setup Doctor"
          />
          <WelcomeScreenButton />
          <ShowSettingsButton />
          <LeftRailButton
            icon={<BugOutlined />}
            small
            title="Feedback / Bug Reporter"
          />
          <LeftRailButton
            icon={<SidebarRight />}
            small
            title="Right Sidebar Toggle"
          />
          <LeftSidebarToggleButton />
          {config.showLogin && <LoginButton />}
        </Layout.Vertical>
      </Layout.Bottom>
    </Layout.Container>
  );
}

function LeftSidebarToggleButton() {
  const mainMenuVisible = useStore(
    (state) => state.application.leftSidebarVisible,
  );

  const dispatch = useDispatch();

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

function ShowSettingsButton() {
  const [showSettings, setShowSettings] = useState(false);
  const onClose = useCallback(() => setShowSettings(false), []);
  return (
    <>
      <LeftRailButton
        icon={<SettingOutlined />}
        small
        title="Settings"
        onClick={() => setShowSettings(true)}
        selected={showSettings}
      />
      {showSettings && (
        <SettingsSheet platform={process.platform} onHide={onClose} useSandy />
      )}
    </>
  );
}

function WelcomeScreenButton() {
  const settings = useStore((state) => state.settingsState);
  const {showWelcomeAtStartup} = settings;
  const dispatch = useDispatch();
  const [visible, setVisible] = useState(showWelcomeAtStartup);

  return (
    <>
      <LeftRailButton
        icon={<QuestionCircleOutlined />}
        small
        title="Help / Start Screen"
        onClick={() => setVisible(true)}
      />
      <WelcomeScreen
        visible={visible}
        onClose={() => setVisible(false)}
        showAtStartup={showWelcomeAtStartup}
        onCheck={(value) =>
          dispatch({
            type: 'UPDATE_SETTINGS',
            payload: {...settings, showWelcomeAtStartup: value},
          })
        }
      />
    </>
  );
}

function LoginButton() {
  const dispatch = useDispatch();
  const user = useStore((state) => state.user);
  const login = (user?.id ?? null) !== null;
  const profileUrl = user?.profile_picture?.uri;
  const [showLogin, setShowLogin] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const onClose = useCallback(() => setShowLogin(false), []);
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
        onClick={() => setShowLogin(true)}
      />
      {showLogin && <SignInSheet onHide={onClose} useSandy />}
    </>
  );
}
