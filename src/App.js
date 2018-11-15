/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import React from 'react';
import {FlexColumn, FlexRow} from 'flipper';
import {connect} from 'react-redux';
import {toggleBugDialogVisible} from './reducers/application.js';
import WelcomeScreen from './chrome/WelcomeScreen.js';
import TitleBar from './chrome/TitleBar.js';
import MainSidebar from './chrome/MainSidebar.js';
import BugReporterDialog from './chrome/BugReporterDialog.js';
import ErrorBar from './chrome/ErrorBar.js';
import PluginContainer from './PluginContainer.js';
import {ipcRenderer} from 'electron';

import type Logger from './fb-stubs/Logger.js';
import type BugReporter from './fb-stubs/BugReporter.js';
import type BaseDevice from './devices/BaseDevice.js';

type Props = {
  logger: Logger,
  bugReporter: BugReporter,
  leftSidebarVisible: boolean,
  bugDialogVisible: boolean,
  pluginManagerVisible: boolean,
  selectedDevice: ?BaseDevice,
  error: ?string,
  toggleBugDialogVisible: (visible?: boolean) => any,
};

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
  render() {
    return (
      <FlexColumn grow={true}>
        <TitleBar />
        {this.props.bugDialogVisible && (
          <BugReporterDialog
            bugReporter={this.props.bugReporter}
            close={() => {
              this.props.toggleBugDialogVisible(false);
            }}
          />
        )}
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
export default connect(
  ({
    application: {pluginManagerVisible, bugDialogVisible, leftSidebarVisible},
    connections: {selectedDevice, error},
  }) => ({
    pluginManagerVisible,
    bugDialogVisible,
    leftSidebarVisible,
    selectedDevice,
    error,
  }),
  {
    toggleBugDialogVisible,
  },
)(App);
