/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import React from 'react';
import {FlexColumn, FlexRow} from 'sonar';
import {connect} from 'react-redux';
import {toggleBugDialogVisible} from './reducers/application.js';
import WelcomeScreen from './chrome/WelcomeScreen.js';
import SonarTitleBar from './chrome/SonarTitleBar.js';
import MainSidebar from './chrome/MainSidebar.js';
import BugReporterDialog from './chrome/BugReporterDialog.js';
import ErrorBar from './chrome/ErrorBar.js';
import PluginContainer from './PluginContainer.js';
import PluginManager from './chrome/PluginManager.js';

import type Logger from './fb-stubs/Logger.js';
import type BugReporter from './fb-stubs/BugReporter.js';

type Props = {
  logger: Logger,
  bugReporter: BugReporter,
  leftSidebarVisible: boolean,
  bugDialogVisible: boolean,
  pluginManagerVisible: boolean,
  selectedDeviceIndex: number,
  error: ?string,
  toggleBugDialogVisible: (visible?: boolean) => void,
};

export class App extends React.Component<Props> {
  constructor(props: Props) {
    performance.mark('init');
    super(props);
  }

  componentDidMount() {
    this.props.logger.trackTimeSince('init');
  }

  render() {
    return (
      <FlexColumn fill={true}>
        <SonarTitleBar />
        {this.props.bugDialogVisible && (
          <BugReporterDialog
            bugReporter={this.props.bugReporter}
            close={() => this.props.toggleBugDialogVisible(false)}
          />
        )}
        {this.props.selectedDeviceIndex > -1 ? (
          <FlexRow fill={true}>
            {this.props.leftSidebarVisible && <MainSidebar />}
            <PluginContainer logger={this.props.logger} />
          </FlexRow>
        ) : this.props.pluginManagerVisible ? (
          <PluginManager />
        ) : (
          <WelcomeScreen />
        )}
        <ErrorBar text={this.props.error} />
      </FlexColumn>
    );
  }
}

export default connect(
  ({
    application: {pluginManagerVisible, bugDialogVisible, leftSidebarVisible},
    connections: {selectedDeviceIndex},
    server: {error},
  }) => ({
    pluginManagerVisible,
    bugDialogVisible,
    leftSidebarVisible,
    selectedDeviceIndex,
    error,
  }),
  {toggleBugDialogVisible},
)(App);
