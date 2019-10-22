/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {FlexColumn, FlexRow} from 'flipper';
import {connect} from 'react-redux';
import TitleBar from './chrome/TitleBar';
import MainSidebar from './chrome/MainSidebar';
import BugReporterDialog from './chrome/BugReporterDialog';
import ErrorBar from './chrome/ErrorBar';
import ShareSheetExportUrl from './chrome/ShareSheetExportUrl';
import SignInSheet from './chrome/SignInSheet';
import ExportDataPluginSheet from './chrome/ExportDataPluginSheet';
import ShareSheetExportFile from './chrome/ShareSheetExportFile';
import PluginContainer from './PluginContainer';
import Sheet from './chrome/Sheet';
import {ipcRenderer, remote} from 'electron';
import {
  ActiveSheet,
  ShareType,
  ACTIVE_SHEET_BUG_REPORTER,
  ACTIVE_SHEET_PLUGINS,
  ACTIVE_SHEET_SHARE_DATA,
  ACTIVE_SHEET_SIGN_IN,
  ACTIVE_SHEET_SETTINGS,
  ACTIVE_SHEET_SHARE_DATA_IN_FILE,
  ACTIVE_SHEET_SELECT_PLUGINS_TO_EXPORT,
  ACTIVE_SHEET_PLUGIN_SHEET,
} from './reducers/application';
import {Logger} from './fb-interfaces/Logger';
import BugReporter from './fb-stubs/BugReporter';
import {State as Store} from './reducers/index';
import {StaticView, FlipperError} from './reducers/connections';
import PluginManager from './chrome/PluginManager';
import StatusBar from './chrome/StatusBar';
import SettingsSheet from './chrome/SettingsSheet';
const version = remote.app.getVersion();

type OwnProps = {
  logger: Logger;
  bugReporter: BugReporter;
};

type StateFromProps = {
  leftSidebarVisible: boolean;
  errors: FlipperError[];
  activeSheet: ActiveSheet;
  share: ShareType | null;
  staticView: StaticView;
};

type Props = StateFromProps & OwnProps;

export class App extends React.Component<Props> {
  componentDidMount() {
    // track time since launch
    const [s, ns] = process.hrtime();
    const launchEndTime = s * 1e3 + ns / 1e6;
    ipcRenderer.on('getLaunchTime', (_: any, launchStartTime: number) => {
      this.props.logger.track(
        'performance',
        'launchTime',
        launchEndTime - launchStartTime,
      );
    });
    ipcRenderer.send('getLaunchTime');
    ipcRenderer.send('componentDidMount');
  }

  getSheet = (onHide: () => any) => {
    const {activeSheet} = this.props;
    switch (activeSheet) {
      case ACTIVE_SHEET_BUG_REPORTER:
        return (
          <BugReporterDialog
            bugReporter={this.props.bugReporter}
            onHide={onHide}
          />
        );
      case ACTIVE_SHEET_PLUGINS:
        return <PluginManager onHide={onHide} />;
      case ACTIVE_SHEET_SIGN_IN:
        return <SignInSheet onHide={onHide} />;
      case ACTIVE_SHEET_SETTINGS:
        return <SettingsSheet onHide={onHide} />;
      case ACTIVE_SHEET_SELECT_PLUGINS_TO_EXPORT:
        return <ExportDataPluginSheet onHide={onHide} />;
      case ACTIVE_SHEET_SHARE_DATA:
        return (
          <ShareSheetExportUrl
            onHide={onHide}
            logger={this.props.logger}
            closeOnFinish={
              this.props.share != null && this.props.share.closeOnFinish
            }
          />
        );
      case ACTIVE_SHEET_SHARE_DATA_IN_FILE:
        return this.props.share && this.props.share.type === 'file' ? (
          <ShareSheetExportFile
            onHide={onHide}
            file={this.props.share.file}
            logger={this.props.logger}
          />
        ) : (
          (() => {
            console.error('No file provided when calling share sheet.');
            return null;
          })()
        );
      case ACTIVE_SHEET_PLUGIN_SHEET:
        // Currently unused.
        return null;
      default:
        return null;
    }
  };

  render() {
    return (
      <FlexColumn grow={true}>
        <TitleBar version={version} />
        <ErrorBar />
        <Sheet>{this.getSheet}</Sheet>
        <FlexRow grow={true}>
          {this.props.leftSidebarVisible && <MainSidebar />}
          {this.props.staticView != null ? (
            React.createElement(this.props.staticView)
          ) : (
            <PluginContainer logger={this.props.logger} />
          )}
        </FlexRow>
        <StatusBar />
      </FlexColumn>
    );
  }
}

export default connect<StateFromProps, {}, OwnProps, Store>(
  ({
    application: {leftSidebarVisible, activeSheet, share},
    connections: {errors, staticView},
  }) => ({
    leftSidebarVisible,
    activeSheet,
    share: share,
    errors,
    staticView,
  }),
)(App);
