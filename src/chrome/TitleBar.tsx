/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  ActiveSheet,
  LauncherMsg,
  ShareType,
  setActiveSheet,
  toggleLeftSidebarVisible,
  toggleRightSidebarVisible,
  ACTIVE_SHEET_BUG_REPORTER,
  ACTIVE_SHEET_SETTINGS,
  ACTIVE_SHEET_DOCTOR,
} from '../reducers/application';
import {
  colors,
  Button,
  ButtonGroup,
  ButtonGroupChain,
  FlexRow,
  Spacer,
  styled,
  Text,
  LoadingIndicator,
  getPluginKey,
} from 'flipper';
import {connect} from 'react-redux';
import RatingButton from './RatingButton';
import DevicesButton from './DevicesButton';
import LocationsButton from './LocationsButton';
import ScreenCaptureButtons from './ScreenCaptureButtons';
import AutoUpdateVersion from './AutoUpdateVersion';
import UpdateIndicator from './UpdateIndicator';
import config from '../fb-stubs/config';
import {isAutoUpdaterEnabled} from '../utils/argvUtils';
import isProduction from '../utils/isProduction';
import {clipboard} from 'electron';
import React from 'react';
import {State} from '../reducers';
import {reportUsage} from '../utils/metrics';
import FpsGraph from './FpsGraph';
import MetroButton from './MetroButton';

const AppTitleBar = styled(FlexRow)<{focused?: boolean}>(({focused}) => ({
  background: focused
    ? `linear-gradient(to bottom, ${colors.macOSTitleBarBackgroundTop} 0%, ${colors.macOSTitleBarBackgroundBottom} 100%)`
    : colors.macOSTitleBarBackgroundBlur,
  borderBottom: `1px solid ${
    focused ? colors.macOSTitleBarBorder : colors.macOSTitleBarBorderBlur
  }`,
  height: 38,
  flexShrink: 0,
  width: '100%',
  alignItems: 'center',
  paddingLeft: 80,
  paddingRight: 10,
  justifyContent: 'space-between',
  WebkitAppRegion: 'drag',
  zIndex: 6,
}));

type OwnProps = {
  version: string;
};

type DispatchFromProps = {
  toggleLeftSidebarVisible: (visible?: boolean) => void;
  toggleRightSidebarVisible: (visible?: boolean) => void;
  setActiveSheet: (sheet: ActiveSheet) => void;
};

type StateFromProps = {
  windowIsFocused: boolean;
  leftSidebarVisible: boolean;
  rightSidebarVisible: boolean;
  rightSidebarAvailable: boolean;
  downloadingImportData: boolean;
  launcherMsg: LauncherMsg;
  share: ShareType | null | undefined;
  navPluginIsActive: boolean;
  isMetroActive: boolean;
};

const VersionText = styled(Text)({
  color: colors.light50,
  marginLeft: 4,
  marginTop: 2,
  cursor: 'pointer',
  display: 'block',
  padding: '4px 10px',
  '&:hover': {
    backgroundColor: `rgba(0,0,0,0.05)`,
    borderRadius: '999em',
  },
});

class Version extends React.Component<{children: string}, {copied: boolean}> {
  state = {
    copied: false,
  };
  _onClick = () => {
    clipboard.writeText(this.props.children);
    this.setState({copied: true});
    setTimeout(() => this.setState({copied: false}), 1000);
  };

  render() {
    return (
      <VersionText onClick={this._onClick}>
        {this.state.copied ? 'Copied' : this.props.children}
      </VersionText>
    );
  }
}

const Importing = styled(FlexRow)({
  color: colors.light50,
  alignItems: 'center',
  marginLeft: 10,
});

function statusMessageComponent(
  downloadingImportData: boolean,
  statusComponent?: React.ReactNode | undefined,
) {
  if (downloadingImportData) {
    return (
      <Importing>
        <LoadingIndicator size={16} />
        &nbsp;Importing data...
      </Importing>
    );
  }
  if (statusComponent) {
    return statusComponent;
  }
  return;
}

type Props = OwnProps & DispatchFromProps & StateFromProps;
class TitleBar extends React.Component<Props, StateFromProps> {
  render() {
    const {navPluginIsActive, share, isMetroActive} = this.props;
    return (
      <AppTitleBar focused={this.props.windowIsFocused} className="toolbar">
        {navPluginIsActive ? (
          <ButtonGroupChain iconSize={12}>
            <DevicesButton />
            <LocationsButton />
          </ButtonGroupChain>
        ) : (
          <DevicesButton />
        )}

        {isMetroActive ? <MetroButton /> : null}

        <ScreenCaptureButtons />
        {statusMessageComponent(
          this.props.downloadingImportData,
          share != null ? share.statusComponent : undefined,
        )}
        <Spacer />

        {!isProduction() && <FpsGraph height={20} width={60} />}

        {config.showFlipperRating ? <RatingButton /> : null}
        <Version>{this.props.version + (isProduction() ? '' : '-dev')}</Version>

        {isAutoUpdaterEnabled() ? (
          <AutoUpdateVersion version={this.props.version} />
        ) : (
          <UpdateIndicator
            launcherMsg={this.props.launcherMsg}
            version={this.props.version}
          />
        )}

        <Button
          icon="settings"
          title="Settings"
          compact={true}
          onClick={() => {
            this.props.setActiveSheet(ACTIVE_SHEET_SETTINGS);
            reportUsage('settings:opened:fromTitleBar');
          }}
        />
        {config.bugReportButtonVisible && (
          <Button
            compact={true}
            onClick={() => this.props.setActiveSheet(ACTIVE_SHEET_BUG_REPORTER)}
            title="Report Bug in Flipper"
            icon="bug"
          />
        )}
        <Button
          icon="first-aid"
          title="Doctor"
          compact={true}
          onClick={() => {
            this.props.setActiveSheet(ACTIVE_SHEET_DOCTOR);
            reportUsage('doctor:report:opened:fromTitleBar');
          }}
        />
        <ButtonGroup>
          <Button
            compact={true}
            selected={this.props.leftSidebarVisible}
            onClick={() => this.props.toggleLeftSidebarVisible()}
            icon="icons/sidebar_left.svg"
            iconSize={20}
            title="Toggle Plugins"
          />
          <Button
            compact={true}
            selected={this.props.rightSidebarVisible}
            onClick={() => this.props.toggleRightSidebarVisible()}
            icon="icons/sidebar_right.svg"
            iconSize={20}
            title="Toggle Details"
            disabled={!this.props.rightSidebarAvailable}
          />
        </ButtonGroup>
      </AppTitleBar>
    );
  }
}

export default connect<StateFromProps, DispatchFromProps, OwnProps, State>(
  ({
    application: {
      windowIsFocused,
      leftSidebarVisible,
      rightSidebarVisible,
      rightSidebarAvailable,
      downloadingImportData,
      launcherMsg,
      share,
    },
    connections: {selectedDevice, selectedApp, devices},
    pluginStates,
  }) => {
    const navigationPluginKey = getPluginKey(
      selectedApp,
      selectedDevice,
      'Navigation',
    );
    const navPluginIsActive = !!pluginStates[navigationPluginKey];
    const isMetroActive = !!devices.find(
      device => device.os === 'Metro' && !device.isArchived,
    );

    return {
      windowIsFocused,
      leftSidebarVisible,
      rightSidebarVisible,
      rightSidebarAvailable,
      downloadingImportData,
      launcherMsg,
      share,
      navPluginIsActive,
      isMetroActive,
    };
  },
  {
    setActiveSheet,
    toggleLeftSidebarVisible,
    toggleRightSidebarVisible,
  },
)(TitleBar);
