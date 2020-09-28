/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {cloneElement, useState, useCallback} from 'react';
import {styled, FlexColumn} from 'flipper';
import {Button, Divider, Badge, Tooltip} from 'antd';
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
import {errorCounterAtom} from '../chrome/ConsoleLogs';
import {ToplevelProps} from './SandyApp';
import {useValue} from 'flipper-plugin';

const LeftRailContainer = styled(FlexColumn)({
  background: theme.backgroundDefault,
  width: 48,
  boxShadow: 'inset -1px 0px 0px rgba(0, 0, 0, 0.1)',
  justifyContent: 'space-between',
});
LeftRailContainer.displayName = 'LeftRailContainer';

const LeftRailSection = styled(FlexColumn)({
  padding: '8px 0px',
  alignItems: 'center',
});
LeftRailSection.displayName = 'LeftRailSection';

const LeftRailButtonElem = styled(Button)<{kind?: 'small'}>(({kind}) => ({
  width: kind === 'small' ? 32 : 36,
  height: kind === 'small' ? 32 : 36,
  margin: 6,
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
  margin: 10,
  width: 36,
  minWidth: 36,
});
LeftRailDivider.displayName = 'LeftRailDividier';

export function LeftRail({
  toplevelSelection,
  setToplevelSelection,
}: ToplevelProps) {
  return (
    <LeftRailContainer>
      <LeftRailSection>
        <LeftRailButton
          icon={<MobileFilled />}
          title="App Inspect"
          selected={toplevelSelection === 'appinspect'}
          onClick={() => {
            setToplevelSelection('appinspect');
          }}
        />
        <LeftRailButton icon={<AppstoreOutlined />} title="Plugin Manager" />
        <LeftRailButton
          count={8}
          icon={<BellOutlined />}
          title="Notifications"
        />
        <LeftRailDivider />
        <DebugLogsButton
          toplevelSelection={toplevelSelection}
          setToplevelSelection={setToplevelSelection}
        />
      </LeftRailSection>
      <LeftRailSection>
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
        <LeftRailButton icon={<LoginOutlined />} title="Log In" />
      </LeftRailSection>
    </LeftRailContainer>
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
