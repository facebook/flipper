/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Dialog, Layout, styled, theme, useValue} from 'flipper-plugin';
import React, {cloneElement, useCallback, useState} from 'react';
import {useDispatch, useStore} from '../utils/useStore';
import config from '../fb-stubs/config';
import {isConnected, currentUser, logoutUser} from '../fb-stubs/user';
import {showLoginDialog} from '../chrome/fb-stubs/SignInSheet';
import {Avatar, Badge, Button, Popover, Tooltip} from 'antd';
import {
  AppstoreAddOutlined,
  BellOutlined,
  CameraOutlined,
  EllipsisOutlined,
  FileExclamationOutlined,
  LayoutOutlined,
  LoginOutlined,
  MedicineBoxOutlined,
  QuestionCircleOutlined,
  RocketOutlined,
  VideoCameraOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {toggleLeftSidebarVisible} from '../reducers/application';
import PluginManager from '../chrome/plugin-manager/PluginManager';
import {showEmulatorLauncher} from './appinspect/LaunchEmulator';

export function Navbar() {
  return (
    <Layout.Horizontal
      borderBottom
      style={{
        width: '100%',
        height: 68,
        padding: `${theme.space.small}px ${theme.space.large}px`,
        alignItems: 'center',
        justifyContent: 'space-between',
        background: theme.backgroundDefault,
      }}>
      <Layout.Horizontal style={{gap: 4}}>
        <LeftSidebarToggleButton />
        <button>device picker</button>
        <NavbarButton label="Screenshot" icon={CameraOutlined} />
        <NavbarButton label="Record" icon={VideoCameraOutlined} />
        <LaunchEmulatorButton />
      </Layout.Horizontal>
      <Layout.Horizontal style={{gap: 4, alignItems: 'center'}}>
        <NavbarButton
          label="Add Plugins"
          icon={AppstoreAddOutlined}
          onClick={() => {
            Dialog.showModal((onHide) => <PluginManager onHide={onHide} />);
          }}
        />
        <NavbarButton label="Logs" icon={FileExclamationOutlined} />
        <NavbarButton label="Alerts" icon={BellOutlined} />
        <NavbarButton label="Doctor" icon={MedicineBoxOutlined} />
        <NavbarButton label="Help" icon={QuestionCircleOutlined} />
        <NavbarButton label="More" icon={EllipsisOutlined} />
        {config.showLogin && <LoginConnectivityButton />}
      </Layout.Horizontal>
    </Layout.Horizontal>
  );
}

function LeftSidebarToggleButton() {
  const dispatch = useDispatch();
  const mainMenuVisible = useStore(
    (state) => state.application.leftSidebarVisible,
  );

  return (
    <NavbarButton
      label="Toggle Sidebar"
      icon={LayoutOutlined}
      toggled={!mainMenuVisible}
      onClick={() => {
        dispatch(toggleLeftSidebarVisible());
      }}
    />
  );
}

function LaunchEmulatorButton() {
  const store = useStore();

  return (
    <NavbarButton
      icon={RocketOutlined}
      label="Start [E/Si]mulator"
      onClick={() => {
        showEmulatorLauncher(store);
      }}
    />
  );
}

function NavbarButton({
  icon: Icon,
  label,
  toggled = false,
  onClick,
}: {
  icon: typeof LoginOutlined;
  label: string;
  selected?: boolean;
  // TODO remove optional
  onClick?: () => void;
  toggled?: boolean;
}) {
  const color = toggled ? theme.primaryColor : theme.textColorActive;
  return (
    <Button
      aria-pressed={toggled}
      ghost
      onClick={onClick}
      style={{
        color,
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        height: 'auto',
      }}>
      <Icon style={{color, fontSize: 24}} />
      <span
        style={{
          margin: 0,
          fontSize: theme.fontSize.small,
          color: theme.textColorSecondary,
        }}>
        {label}
      </span>
    </Button>
  );
}

function LoginConnectivityButton() {
  const loggedIn = useValue(currentUser());
  const user = useStore((state) => state.user);

  const profileUrl = user?.profile_picture?.uri;
  const [showLogout, setShowLogout] = useState(false);
  const onHandleVisibleChange = useCallback(
    (visible) => setShowLogout(visible),
    [],
  );

  const connected = useValue(isConnected());

  if (!connected) {
    return (
      <Tooltip
        placement="left"
        title="No connection to intern, ensure you are VPN/Lighthouse for plugin updates and other features">
        <WarningOutlined
          style={{color: theme.warningColor, fontSize: '20px'}}
        />
      </Tooltip>
    );
  }

  return loggedIn ? (
    <Popover
      content={
        <Button
          block
          style={{backgroundColor: theme.backgroundDefault}}
          onClick={async () => {
            onHandleVisibleChange(false);
            await logoutUser();
          }}>
          Log Out
        </Button>
      }
      trigger="click"
      placement="bottom"
      visible={showLogout}
      overlayStyle={{padding: 0}}
      onVisibleChange={onHandleVisibleChange}>
      <Layout.Container padv={theme.inlinePaddingV}>
        <Avatar size={40} src={profileUrl} />
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

const LeftRailButtonElem = styled(Button)<{kind?: 'small'}>(({kind}) => ({
  width: kind === 'small' ? 32 : 36,
  height: kind === 'small' ? 32 : 36,
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
