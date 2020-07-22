/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {FlexRow, styled, Layout} from 'flipper';
import {connect} from 'react-redux';
import TitleBar from './chrome/TitleBar';
import MainSidebar2 from './chrome/mainsidebar/MainSidebar2';
import ErrorBar from './chrome/ErrorBar';
import DoctorBar from './chrome/DoctorBar';
import ShareSheetExportUrl from './chrome/ShareSheetExportUrl';
import SignInSheet from './chrome/SignInSheet';
import ExportDataPluginSheet from './chrome/ExportDataPluginSheet';
import ShareSheetExportFile from './chrome/ShareSheetExportFile';
import JSEmulatorLauncherSheet from './chrome/JSEmulatorLauncherSheet';
import PluginContainer from './PluginContainer';
import Sheet from './chrome/Sheet';
import {ipcRenderer, remote} from 'electron';
import {
  ActiveSheet,
  ShareType,
  ACTIVE_SHEET_PLUGINS,
  ACTIVE_SHEET_SHARE_DATA,
  ACTIVE_SHEET_SIGN_IN,
  ACTIVE_SHEET_SETTINGS,
  ACTIVE_SHEET_DOCTOR,
  ACTIVE_SHEET_SHARE_DATA_IN_FILE,
  ACTIVE_SHEET_SELECT_PLUGINS_TO_EXPORT,
  ACTIVE_SHEET_PLUGIN_SHEET,
  ACTIVE_SHEET_JS_EMULATOR_LAUNCHER,
  ACTIVE_SHEET_CHANGELOG,
  setActiveSheet,
  ACTIVE_SHEET_CHANGELOG_RECENT_ONLY,
} from './reducers/application';
import {Logger} from './fb-interfaces/Logger';
import {State as Store} from './reducers/index';
import {StaticView, FlipperError} from './reducers/connections';
import PluginManager from './chrome/plugin-manager/PluginManager';
import StatusBar from './chrome/StatusBar';
import SettingsSheet from './chrome/SettingsSheet';
import DoctorSheet from './chrome/DoctorSheet';
import ChangelogSheet, {hasNewChangesToShow} from './chrome/ChangelogSheet';
import QuickPerformanceLogger, {
  QuickLogActionType,
  FLIPPER_QPL_EVENTS,
} from './fb-stubs/QPL';

const version = remote.app.getVersion();

type OwnProps = {
  logger: Logger;
};

type StateFromProps = {
  leftSidebarVisible: boolean;
  errors: FlipperError[];
  activeSheet: ActiveSheet;
  share: ShareType | null;
  staticView: StaticView;
};

type DispatchProps = {
  setActiveSheet: typeof setActiveSheet;
};

/**
 * This wrapper is only needed for hacky plugins that place contents out of
 * contents, like hermes debugger
 */
const PluginContent = styled(FlexRow)({
  width: '100%',
  height: '100%',
  position: 'relative',
});
PluginContent.displayName = 'App:PluginContent';
type Props = StateFromProps & OwnProps & DispatchProps;

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

      QuickPerformanceLogger.markerPoint(
        FLIPPER_QPL_EVENTS.STARTUP,
        'launchStartTime',
        launchStartTime.toString(),
      );

      QuickPerformanceLogger.markerEnd(
        FLIPPER_QPL_EVENTS.STARTUP,
        QuickLogActionType.SUCCESS,
        0,
        launchEndTime,
      );
    });

    ipcRenderer.send('getLaunchTime');
    ipcRenderer.send('componentDidMount');

    if (hasNewChangesToShow(window.localStorage)) {
      this.props.setActiveSheet(ACTIVE_SHEET_CHANGELOG_RECENT_ONLY);
    }
  }

  getSheet = (onHide: () => any) => {
    const {activeSheet} = this.props;
    switch (activeSheet) {
      case ACTIVE_SHEET_PLUGINS:
        return <PluginManager onHide={onHide} />;
      case ACTIVE_SHEET_SIGN_IN:
        return <SignInSheet onHide={onHide} />;
      case ACTIVE_SHEET_SETTINGS:
        return <SettingsSheet platform={process.platform} onHide={onHide} />;
      case ACTIVE_SHEET_DOCTOR:
        return <DoctorSheet onHide={onHide} />;
      case ACTIVE_SHEET_CHANGELOG:
        return <ChangelogSheet onHide={onHide} />;
      case ACTIVE_SHEET_CHANGELOG_RECENT_ONLY:
        return <ChangelogSheet onHide={onHide} recent />;
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
      case ACTIVE_SHEET_JS_EMULATOR_LAUNCHER:
        return <JSEmulatorLauncherSheet onHide={onHide} />;
      default:
        return null;
    }
  };

  render() {
    return (
      <Layout.Top>
        <Layout.Top>
          <TitleBar version={version} />
          <>
            <Sheet>{this.getSheet}</Sheet>
            <DoctorBar />
            <ErrorBar />
          </>
        </Layout.Top>
        <Layout.Bottom>
          <Layout.Left>
            {this.props.leftSidebarVisible && <MainSidebar2 />}
            <PluginContent>
              {this.props.staticView != null ? (
                React.createElement(this.props.staticView, {
                  logger: this.props.logger,
                })
              ) : (
                <PluginContainer logger={this.props.logger} />
              )}
              <div
                id="flipper-out-of-contents-container"
                style={{
                  display: 'none',
                  position: 'absolute',
                  right: 0,
                  bottom: 0,
                  left: 0,
                  top: 0,
                }}
              />
            </PluginContent>
          </Layout.Left>
          <StatusBar />
        </Layout.Bottom>
      </Layout.Top>
    );
  }
}

export default connect<StateFromProps, DispatchProps, OwnProps, Store>(
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
  {
    setActiveSheet,
  },
)(App);
