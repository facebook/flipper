/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  Dialog,
  Layout,
  NUX,
  theme,
  useMemoize,
  useTrackedCallback,
  useValue,
  withTrackingScope,
} from 'flipper-plugin';
import React, {useEffect, useMemo, useState} from 'react';
import {useDispatch, useStore} from '../utils/useStore';
import config from '../fb-stubs/config';
import {currentUser, isConnected, logoutUser} from '../fb-stubs/user';
import {Badge, Button, Menu, Modal} from 'antd';
import {
  BellOutlined,
  BugOutlined,
  LayoutOutlined,
  RocketOutlined,
  SettingOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  toggleConnectivityModal,
  toggleLeftSidebarVisible,
  toggleRightSidebarVisible,
  toggleSettingsModal,
} from '../reducers/application';
import PluginManager from '../chrome/plugin-manager/PluginManager';
import {showEmulatorLauncher} from './appinspect/LaunchEmulator';
import SetupDoctorScreen, {
  checkHasNewProblem,
  checkHasProblem,
} from './SetupDoctorScreen';
import {isProduction} from 'flipper-common';
import FpsGraph from '../chrome/FpsGraph';
import NetworkGraph from '../chrome/NetworkGraph';
import {errorCounterAtom} from '../chrome/ConsoleLogs';
import {filterNotifications} from './notification/notificationUtils';
import {
  exportEverythingEverywhereAllAtOnce,
  ExportEverythingEverywhereAllAtOnceStatus,
  startFileImport,
  startFileExport,
  startLinkExport,
} from '../utils/exportData';
import UpdateIndicator from '../chrome/UpdateIndicator';
import {css} from '@emotion/css';
import constants from '../fb-stubs/constants';
import {setStaticView} from '../reducers/connections';
import {StyleGuide} from './StyleGuide';
import {openDeeplinkDialog} from '../deeplink';
import SettingsSheet from '../chrome/SettingsSheet';
import WelcomeScreen from './WelcomeScreen';
import {AppSelector} from './appinspect/AppSelector';
import {
  NavbarScreenRecordButton,
  NavbarScreenshotButton,
} from '../chrome/ScreenCaptureButtons';
import {StatusMessage} from './appinspect/AppInspect';
import {TroubleshootingGuide} from './appinspect/fb-stubs/TroubleshootingGuide';
import {FlipperDevTools} from '../chrome/FlipperDevTools';
import {TroubleshootingHub} from '../chrome/TroubleshootingHub';
import {Notification} from './notification/Notification';
import {SandyRatingButton} from './RatingButton';
import {getFlipperServerConfig} from '../flipperServer';
import {showChangelog} from '../chrome/ChangelogSheet';
import {FlipperSetupWizard} from '../chrome/FlipperSetupWizard';

export const Navbar = withTrackingScope(function Navbar() {
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
      <Layout.Horizontal style={{gap: 6}}>
        <LeftSidebarToggleButton />
        <AppSelector />
        <StatusMessage />
        <NavbarScreenshotButton />
        <NavbarScreenRecordButton />
        <LaunchVirtualDeviceButton />
        {!isProduction() && (
          <div>
            <FpsGraph />
            <NetworkGraph />
          </div>
        )}
      </Layout.Horizontal>
      <Layout.Horizontal style={{gap: 6, alignItems: 'center'}}>
        <NoConnectivityWarning />

        <NotificationButton />
        <TroubleshootMenu />
        <SandyRatingButton />
        <ExtrasMenu />
        <RightSidebarToggleButton />
        <UpdateIndicator />
      </Layout.Horizontal>
    </Layout.Horizontal>
  );
});

function ExportEverythingEverywhereAllAtOnceStatusModal({
  status,
  setStatus,
}: {
  status: ExportEverythingEverywhereAllAtOnceStatus | undefined;
  setStatus: (
    newStatus: ExportEverythingEverywhereAllAtOnceStatus | undefined,
  ) => void;
}) {
  const [statusMessage, setStatusMessage] = useState<JSX.Element | undefined>();

  useEffect(() => {
    switch (status?.[0]) {
      case 'logs': {
        setStatusMessage(<p>Exporting Flipper logs...</p>);
        return;
      }
      case 'files': {
        let sheepCount = 0;
        const setFileExportMessage = () => {
          setStatusMessage(
            <>
              <p>Exporting Flipper debug files from all devices...</p>
              <p>It could take a long time!</p>
              <p>Let's count sheep while we wait: {sheepCount++}.</p>
              <p>We'll skip it automatically if it exceeds 3 minutes.</p>
            </>,
          );
        };

        setFileExportMessage();

        const interval = setInterval(setFileExportMessage, 3000);
        return () => clearInterval(interval);
      }
      case 'state': {
        let dinosaursCount = 0;
        const setStateExportMessage = () => {
          setStatusMessage(
            <>
              <p>Exporting Flipper state...</p>
              <p>It also could take a long time!</p>
              <p>This time we could count dinosaurs: {dinosaursCount++}.</p>
              <p>We'll skip it automatically if it exceeds 2 minutes.</p>
            </>,
          );
        };

        setStateExportMessage();

        const interval = setInterval(setStateExportMessage, 2000);
        return () => clearInterval(interval);
      }
      case 'archive': {
        setStatusMessage(<p>Creating an archive...</p>);
        return;
      }
      case 'upload': {
        setStatusMessage(<p>Uploading the archive...</p>);
        return;
      }
      case 'support': {
        setStatusMessage(<p>Creating a support request...</p>);
        return;
      }
      case 'error': {
        setStatusMessage(
          <>
            <p>Oops! Something went wrong.</p>
            <p>{status[1]}</p>
          </>,
        );
        return;
      }
      case 'done': {
        setStatusMessage(<p>Done!</p>);
        return;
      }
      case 'cancelled': {
        setStatusMessage(<p>Cancelled! Why? 😱🤯👏</p>);
        return;
      }
    }
  }, [status]);

  return (
    <Modal
      open={!!status}
      centered
      onCancel={() => {
        setStatus(undefined);
      }}
      title="Exporting everything everywhere all at once"
      footer={null}>
      {statusMessage}
    </Modal>
  );
}

function NotificationButton() {
  const store = useStore();
  const isOpen = useStore((store) => store.application.isNotificationModalOpen);
  const notifications = useStore((state) => state.notifications);
  const activeNotifications = useMemoize(filterNotifications, [
    notifications.activeNotifications,
    notifications.blocklistedPlugins,
    notifications.blocklistedCategories,
  ]);
  return (
    <>
      <NavbarButton
        icon={BellOutlined}
        label="Alerts"
        zIndex={AlertsZIndex}
        count={activeNotifications.length}
        onClick={() => {
          store.dispatch({type: 'isNotificationModalOpen', payload: true});
        }}
      />
      <Modal
        open={isOpen}
        onCancel={() =>
          store.dispatch({type: 'isNotificationModalOpen', payload: false})
        }
        width="70vw"
        footer={null}>
        <div style={{minHeight: '80vh', display: 'flex'}}>
          <Notification />
        </div>
      </Modal>
    </>
  );
}

function LeftSidebarToggleButton() {
  const dispatch = useDispatch();
  const mainMenuVisible = useStore(
    (state) => state.application.leftSidebarVisible,
  );

  return (
    <NavbarButton
      label="Sidebar"
      icon={LayoutOutlined}
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
    <NavbarButton
      icon={LayoutOutlined}
      flipIcon
      disabled={!rightSidebarAvailable}
      label="Sidebar"
      toggled={rightSidebarAvailable && rightSidebarVisible}
      onClick={() => {
        dispatch(toggleRightSidebarVisible());
      }}
    />
  );
}

function LaunchVirtualDeviceButton() {
  const store = useStore();

  return (
    <NavbarButton
      icon={RocketOutlined}
      label="Virtual Device"
      onClick={() => {
        showEmulatorLauncher(store);
      }}
    />
  );
}

const badgeDotClassname = css`
  sup {
    right: calc(50% - 14px);
    margin-top: 8px;
  }
`;
const badgeCountClassname = css`
  sup {
    right: calc(50% - 22px);
    margin-top: 8px;
  }
`;

const hideBorderWhenDisabled = css`
  :disabled {
    border-color: transparent !important;
  }
  :disabled:hover {
    border-color: ${theme.disabledColor} !important;
  }
`;

export function NavbarButton({
  icon: Icon,
  label,
  toggled = false,
  onClick,
  count,
  disabled = false,
  flipIcon = false,
  zIndex,
  colorOverride,
}: {
  icon: (props: any) => any;
  label: string;
  // TODO remove optional
  colorOverride?: string;
  zIndex?: number;
  onClick?: () => void;
  toggled?: boolean;
  count?: number | true;
  disabled?: boolean;
  flipIcon?: boolean;
}) {
  const color = toggled ? theme.primaryColor : theme.textColorActive;
  const button = (
    <Button
      className={hideBorderWhenDisabled}
      aria-pressed={toggled}
      ghost
      onClick={onClick}
      style={{
        boxSizing: 'border-box',
        color,
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        height: 'auto',
        padding: theme.space.tiny,
      }}
      disabled={disabled}>
      <Icon
        style={{
          color: colorOverride || color,
          fontSize: 24,
          transform: flipIcon ? 'scaleX(-1)' : undefined,
        }}
      />
      <span
        style={{
          margin: 0,
          fontSize: theme.fontSize.small,
          color: colorOverride || theme.textColorSecondary,
        }}>
        {label}
      </span>
    </Button>
  );

  if (count !== undefined) {
    return (
      <Badge
        style={{zIndex: zIndex}}
        {...{onClick}}
        dot={count === true}
        count={count}
        // using count instead of "offset" prop as we need to perform css calc()
        // while antd internally calls `parseInt` on passed string
        className={count === true ? badgeDotClassname : badgeCountClassname}>
        {button}
      </Badge>
    );
  } else {
    return button;
  }
}

function NoConnectivityWarning() {
  const connected = useValue(isConnected());

  if (!connected) {
    return (
      <NavbarButton
        disabled
        icon={WarningOutlined}
        colorOverride={theme.errorColor}
        label="No connectivity"
      />
    );
  }

  return null;
}

const menu = css`
  border: none;
  height: 56px;

  .ant-menu-submenu-title {
    hieght: 56px;
  }
`;
const submenu = css`
  height: 56px;

  .ant-menu-submenu-title {
    height: 56px !important;
    padding: 0;
    margin: 0;
  }
  .ant-menu-submenu-arrow {
    display: none;
  }
`;

const AlertsZIndex = 101;
const TroubleShootZIndex = 100;

function TroubleshootMenu() {
  const store = useStore();
  const [status, setStatus] = useState<
    ExportEverythingEverywhereAllAtOnceStatus | undefined
  >();
  const [isFlipperDevToolsModalOpen, setFlipperDevToolsModalOpen] =
    useState(false);

  const exportEverythingEverywhereAllAtOnceTracked = useTrackedCallback(
    'Debug data export',
    () =>
      exportEverythingEverywhereAllAtOnce(
        store,
        (...args) => setStatus(args),
        config.isFBBuild,
      ),
    [store, setStatus],
  );

  const flipperErrorLogCount = useValue(errorCounterAtom);

  /**
   * About Doctor. Get the healthcheck report.
   *
   * checkHasProblem: check if there are problems in the healthcheck report.
   * checkHasNewProblem: check if there are new problems in the healthcheck
   * report since the last time it was checked or acknowledged, hence the new keyword.
   *
   * The first time Flipper is opened, show doctor if there's any problems.
   * After this, use hasNewProblems as a means to show Doctor if needed.
   */
  const result = useStore(
    (state) => state.healthchecks.healthcheckReport.result,
  );
  const isSetupWizardOpen = useStore(
    (state) => state.application.isSetupWizardOpen,
  );
  const hasProblem = useMemo(() => checkHasProblem(result), [result]);
  const hasNewProblem = useMemo(() => checkHasNewProblem(result), [result]);

  const [isDoctorVisible, setIsDoctorVisible] = useState(hasProblem);

  useEffect(() => {
    if (hasNewProblem && !isSetupWizardOpen) {
      setIsDoctorVisible(true);
    }
  }, [hasNewProblem, isSetupWizardOpen]);

  const count = flipperErrorLogCount || hasNewProblem || 0;

  const badgeProps: Parameters<typeof Badge>[0] =
    count === true ? {dot: true, offset: [-8, 8]} : {count, offset: [-6, 5]};

  return (
    <>
      {/* using Badge **here** as NavbarButton badge is being cut off by Menu component */}
      <Badge {...badgeProps} style={{zIndex: TroubleShootZIndex}}>
        <Menu
          mode="vertical"
          className={menu}
          selectable={false}
          style={{backgroundColor: theme.backgroundDefault}}>
          <Menu.SubMenu
            popupOffset={[-90, 50]}
            key="troubleshooting"
            title={<NavbarButton icon={BugOutlined} label="Troubleshoot" />}
            className={submenu}>
            <Menu.Item
              key="setupdoctor"
              onClick={() => setIsDoctorVisible(true)}>
              <Badge dot={hasNewProblem}>Setup Doctor</Badge>
            </Menu.Item>
            <Menu.Item
              key="connectivity"
              onClick={() => {
                store.dispatch(toggleConnectivityModal());
              }}>
              Troubleshoot Connectivity
            </Menu.Item>
            <TroubleshootingGuide />

            <Menu.Item
              key="rage"
              onClick={exportEverythingEverywhereAllAtOnceTracked}>
              Export All
            </Menu.Item>
            <Menu.Item
              key="flipperlogs"
              onClick={() => {
                setFlipperDevToolsModalOpen(true);
              }}>
              <Layout.Horizontal center gap="small">
                Flipper Logs <Badge count={flipperErrorLogCount} />
              </Layout.Horizontal>
            </Menu.Item>
          </Menu.SubMenu>
        </Menu>
      </Badge>
      <SetupDoctorScreen
        visible={isDoctorVisible}
        onClose={() => setIsDoctorVisible(false)}
      />
      <ExportEverythingEverywhereAllAtOnceStatusModal
        status={status}
        setStatus={setStatus}
      />
      <FlipperDevToolsModal
        isOpen={isFlipperDevToolsModalOpen}
        onClose={() => setFlipperDevToolsModalOpen(false)}
      />
      <TroubleshootingModal />
    </>
  );
}

function TroubleshootingModal() {
  const store = useStore();
  const isOpen = useStore(
    (state) => state.application.isTroubleshootingModalOpen,
  );
  return (
    <Modal
      open={isOpen}
      onCancel={() => store.dispatch(toggleConnectivityModal())}
      width="100%"
      footer={null}
      style={{
        // override default `top: 100px`
        top: '5vh',
      }}>
      <div style={{minHeight: '80vh', width: '100%', display: 'flex'}}>
        <TroubleshootingHub />
      </div>
    </Modal>
  );
}

function FlipperDevToolsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      width="100%"
      footer={null}
      style={{
        // override default `top: 100px`
        top: '5vh',
      }}>
      <div style={{minHeight: '85vh', width: '100%', display: 'flex'}}>
        <FlipperDevTools />
      </div>
    </Modal>
  );
}

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
  const startFileImportTracked = useTrackedCallback(
    'File import',
    () => startFileImport(store),
    [store],
  );

  const isSettingModalOpen = useStore(
    (state) => state.application.isSettingsModalOpen,
  );
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const loggedIn = useValue(currentUser());

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
            popupOffset={[-50, 50]}
            key="extras"
            title={<NavbarButton icon={SettingOutlined} label="More" />}
            className={submenu}>
            <Menu.Item
              key="addplugins"
              onClick={() => {
                Dialog.showModal((onHide) => <PluginManager onHide={onHide} />);
              }}>
              Add Plugins
            </Menu.Item>
            <Menu.Item key="importFlipperFile" onClick={startFileImportTracked}>
              Import Flipper file
            </Menu.Item>
            <Menu.Item key="exportFlipperFile" onClick={startFileExportTracked}>
              Export Flipper file
            </Menu.Item>
            {constants.ENABLE_SHAREABLE_LINK ? (
              <Menu.Item
                key="exportShareableLink"
                onClick={startLinkExportTracked}>
                Export shareable link
              </Menu.Item>
            ) : null}
            <Menu.Divider />
            <Menu.SubMenu key="plugin developers" title="Plugin developers">
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
            <Menu.Item
              key="settings"
              onClick={() => store.dispatch(toggleSettingsModal(true))}>
              Settings
            </Menu.Item>
            <Menu.Item
              key="setupWizard"
              onClick={() => {
                Dialog.showModal((onHide) => (
                  <FlipperSetupWizard onHide={onHide} closable />
                ));
              }}>
              Setup wizard
            </Menu.Item>
            <Menu.Item key="help" onClick={() => setWelcomeVisible(true)}>
              Help
            </Menu.Item>
            <Menu.Item key="changelog" onClick={showChangelog}>
              Changelog
            </Menu.Item>
            {config.showLogin && loggedIn && (
              <Menu.Item key="logout" onClick={async () => await logoutUser()}>
                Logout
              </Menu.Item>
            )}
          </Menu.SubMenu>
        </Menu>
      </NUX>
      {isSettingModalOpen && (
        <SettingsSheet
          platform={getFlipperServerConfig().environmentInfo.os.platform}
          onHide={() => store.dispatch(toggleSettingsModal())}
        />
      )}
      <WelcomeScreen
        visible={welcomeVisible}
        onClose={() => setWelcomeVisible(false)}
      />
    </>
  );
}
