/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {
  cloneElement,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
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
  RocketOutlined,
} from '@ant-design/icons';
import {SidebarLeft, SidebarRight} from './SandyIcons';
import {useDispatch, useStore} from '../utils/useStore';
import {
  ACTIVE_SHEET_PLUGINS,
  setActiveSheet,
  toggleLeftSidebarVisible,
  toggleRightSidebarVisible,
} from '../reducers/application';
import {theme, Layout, withTrackingScope} from 'flipper-plugin';
import SetupDoctorScreen, {checkHasNewProblem} from './SetupDoctorScreen';
import SettingsSheet from '../chrome/SettingsSheet';
import WelcomeScreen from './WelcomeScreen';
import SignInSheet from '../chrome/SignInSheet';
import {errorCounterAtom} from '../chrome/ConsoleLogs';
import {ToplevelProps} from './SandyApp';
import {useValue} from 'flipper-plugin';
import {logout, USER_NOT_SIGNEDIN, USER_UNAUTHORIZED} from '../reducers/user';
import config from '../fb-stubs/config';
import styled from '@emotion/styled';
import {showEmulatorLauncher} from './appinspect/LaunchEmulator';
import {useStore as useReduxStore} from 'react-redux';
import SupportRequestFormV2 from '../fb-stubs/SupportRequestFormV2';
import {setStaticView} from '../reducers/connections';
import {getInstance} from '../fb-stubs/Logger';
import {isStaticViewActive} from '../chrome/mainsidebar/sidebarUtils';
import {getUser} from '../fb-stubs/user';
import {SandyRatingButton} from '../chrome/RatingButton';
import {filterNotifications} from './notification/notificationUtils';
import {useMemoize} from '../utils/useMemoize';

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
  title: string;
  onClick?: React.MouseEventHandler<HTMLElement>;
}) {
  let iconElement =
    icon && cloneElement(icon, {style: {fontSize: small ? 16 : 24}});
  if (count !== undefined) {
    iconElement =
      count === true ? (
        <Badge dot>{iconElement}</Badge>
      ) : (
        <Badge count={count}>{iconElement}</Badge>
      );
  }
  return (
    <Tooltip title={title} placement="right">
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
    </Tooltip>
  );
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
  const dispatch = useDispatch();
  return (
    <Layout.Container borderRight padv={12} width={48}>
      <Layout.Bottom>
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
              dispatch(setActiveSheet(ACTIVE_SHEET_PLUGINS));
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
          <SandyRatingButton />
          <LaunchEmulatorButton />
          <SetupDoctorButton />
          <WelcomeScreenButton />
          <ShowSettingsButton />
          <SupportFormButton />
          <RightSidebarToggleButton />
          <LeftSidebarToggleButton />
          {config.showLogin && <LoginButton />}
        </Layout.Container>
      </Layout.Bottom>
    </Layout.Container>
  );
});

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
  const store = useReduxStore();

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

function SupportFormButton() {
  const dispatch = useDispatch();
  const staticView = useStore((state) => state.connections.staticView);
  // const isVisible =
  return (
    <LeftRailButton
      icon={<BugOutlined />}
      small
      title="Feedback / Bug Reporter"
      selected={isStaticViewActive(staticView, SupportRequestFormV2)}
      onClick={() => {
        getInstance().track('usage', 'support-form-source', {
          source: 'sidebar',
          group: undefined,
        });
        dispatch(setStaticView(SupportRequestFormV2));
      }}
    />
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

  useEffect(() => {
    if (config.showLogin) {
      getUser().catch((error) => {
        if (error === USER_UNAUTHORIZED || error === USER_NOT_SIGNEDIN) {
          setShowLogin(true);
        }
      });
    }
  }, []);

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
