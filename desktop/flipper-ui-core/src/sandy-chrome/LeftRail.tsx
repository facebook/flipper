/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {cloneElement, useState, useCallback} from 'react';
import {Button, Divider, Badge, Tooltip, Menu, Modal} from 'antd';
import {
  MobileFilled,
  BellOutlined,
  FileExclamationOutlined,
  SettingOutlined,
  BugOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import {SidebarRight} from './SandyIcons';
import {useDispatch, useStore} from '../utils/useStore';
import {toggleRightSidebarVisible} from '../reducers/application';
import {
  theme,
  Layout,
  withTrackingScope,
  useTrackedCallback,
  NUX,
} from 'flipper-plugin';
import SettingsSheet from '../chrome/SettingsSheet';
import WelcomeScreen from './WelcomeScreen';
import {errorCounterAtom} from '../chrome/ConsoleLogs';
import {ToplevelProps} from './SandyApp';
import {useValue} from 'flipper-plugin';
import config from '../fb-stubs/config';
import styled from '@emotion/styled';
import {setStaticView} from '../reducers/connections';
import {SandyRatingButton} from '../chrome/RatingButton';
import {filterNotifications} from './notification/notificationUtils';
import {useMemoize} from 'flipper-plugin';
import UpdateIndicator from '../chrome/UpdateIndicator';
import constants from '../fb-stubs/constants';
import {
  canFileExport,
  canOpenDialog,
  exportEverythingEverywhereAllAtOnce,
  showOpenDialog,
  startFileExport,
  startLinkExport,
  ExportEverythingEverywhereAllAtOnceStatus,
} from '../utils/exportData';
import {openDeeplinkDialog} from '../deeplink';
import {css} from '@emotion/css';
import {getRenderHostInstance} from 'flipper-frontend-core';
import {StyleGuide} from './StyleGuide';
import {useEffect} from 'react';

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
    <Layout.Container
      borderRight
      borderTop
      padv={12}
      width={48}
      style={{background: theme.backgroundDefault}}>
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
          <NotificationButton
            toplevelSelection={toplevelSelection}
            setToplevelSelection={setToplevelSelection}
          />
          {getRenderHostInstance().GK('flipper_connection_troubleshoot') && (
            <ConnectionTroubleshootButton
              toplevelSelection={toplevelSelection}
              setToplevelSelection={setToplevelSelection}
            />
          )}
          <LeftRailDivider />
          <DebugLogsButton
            toplevelSelection={toplevelSelection}
            setToplevelSelection={setToplevelSelection}
          />
        </Layout.Container>
        <Layout.Container center gap={10} padh={6}>
          <UpdateIndicator />
          <SandyRatingButton />
          <RightSidebarToggleButton />
          <ExportEverythingEverywhereAllAtOnceButton />
          <ExtrasMenu />
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

function ConnectionTroubleshootButton({
  toplevelSelection,
  setToplevelSelection,
}: ToplevelProps) {
  return (
    <LeftRailButton
      icon={<ApiOutlined />}
      title="Connection Troubleshoot"
      selected={toplevelSelection === 'connectivity'}
      onClick={() => {
        setToplevelSelection('connectivity');
      }}
    />
  );
}

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
      visible={!!status}
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

function ExportEverythingEverywhereAllAtOnceButton() {
  const store = useStore();
  const [status, setStatus] = useState<
    ExportEverythingEverywhereAllAtOnceStatus | undefined
  >();

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

  return (
    <>
      <ExportEverythingEverywhereAllAtOnceStatusModal
        status={status}
        setStatus={setStatus}
      />
      <NUX title="Press this button if you have issues with Flipper. It will collect Flipper debug data that you can send to the Flipper team to get help.">
        <LeftRailButton
          icon={<BugOutlined />}
          title="Export Flipper debug data"
          onClick={() => {
            exportEverythingEverywhereAllAtOnceTracked();
          }}
          small
        />
      </NUX>
    </>
  );
}
