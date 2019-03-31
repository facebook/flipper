/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import React from 'react';
import {FlexColumn, FlexRow} from 'flipper';
import {connect} from 'react-redux';
import WelcomeScreen from './chrome/WelcomeScreen.js';
import TitleBar from './chrome/TitleBar.js';
import MainSidebar from './chrome/MainSidebar.js';
import BugReporterDialog from './chrome/BugReporterDialog.js';
import ErrorBar from './chrome/ErrorBar.js';
import ShareSheet from './chrome/ShareSheet.js';
import SignInSheet from './chrome/SignInSheet.js';
import PluginContainer from './PluginContainer.js';
import Sheet from './chrome/Sheet.js';
import {ipcRenderer, remote} from 'electron';
import PluginDebugger from './chrome/PluginDebugger.js';
import {
  ACTIVE_SHEET_BUG_REPORTER,
  ACTIVE_SHEET_PLUGIN_DEBUGGER,
  ACTIVE_SHEET_SHARE_DATA,
  ACTIVE_SHEET_SIGN_IN,
} from './reducers/application.js';

import type {Logger} from './fb-interfaces/Logger.js';
import type BugReporter from './fb-stubs/BugReporter.js';
import type BaseDevice from './devices/BaseDevice.js';
import type {ActiveSheet} from './reducers/application.js';

const version = remote.app.getVersion();

type OwnProps = {|
  logger: Logger,
  bugReporter: BugReporter,
|};

type Props = {|
  ...OwnProps,
  leftSidebarVisible: boolean,
  selectedDevice: ?BaseDevice,
  error: ?string,
  activeSheet: ActiveSheet,
|};

export class App extends React.Component<Props> {
  componentDidMount() {
    // track time since launch
    const [s, ns] = process.hrtime();
    const launchEndTime = s * 1e3 + ns / 1e6;
    ipcRenderer.on('getLaunchTime', (event, launchStartTime) => {
      this.props.logger.track(
        'performance',
        'launchTime',
        launchEndTime - launchStartTime,
      );
    });
    ipcRenderer.send('getLaunchTime');
    ipcRenderer.send('componentDidMount');
  }

  getSheet = (onHide: () => mixed) => {
    if (this.props.activeSheet === ACTIVE_SHEET_BUG_REPORTER) {
      return (
        <BugReporterDialog
          bugReporter={this.props.bugReporter}
          onHide={onHide}
        />
      );
    } else if (this.props.activeSheet === ACTIVE_SHEET_PLUGIN_DEBUGGER) {
      return <PluginDebugger onHide={onHide} />;
    } else if (this.props.activeSheet === ACTIVE_SHEET_SHARE_DATA) {
      return <ShareSheet onHide={onHide} />;
    } else if (this.props.activeSheet === ACTIVE_SHEET_SIGN_IN) {
      return <SignInSheet onHide={onHide} />;
    } else {
      // contents are added via React.Portal
      return null;
    }
  };

  render() {
    return (
      <FlexColumn grow={true}>
        <TitleBar version={version} />
        <Sheet>{this.getSheet}</Sheet>
        <FlexRow grow={true}>
          {this.props.leftSidebarVisible && <MainSidebar />}
          {this.props.selectedDevice ? (
            <PluginContainer logger={this.props.logger} />
          ) : (
            <WelcomeScreen />
          )}
        </FlexRow>
        <ErrorBar text={this.props.error} />
      </FlexColumn>
    );
  }
}

export default connect<Props, OwnProps, _, _, _, _>(
  ({
    application: {leftSidebarVisible, activeSheet},
    connections: {selectedDevice, error},
  }) => ({
    leftSidebarVisible,
    selectedDevice,
    activeSheet,
    error,
  }),
)(App);
