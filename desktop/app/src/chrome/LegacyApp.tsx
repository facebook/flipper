/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {FlexRow, styled, Layout} from '../ui';
import {connect} from 'react-redux';
import TitleBar from './TitleBar';
import MainSidebar2 from './mainsidebar/MainSidebar2';
import DoctorBar from './DoctorBar';
import PluginContainer from '../PluginContainer';
import {ipcRenderer, remote} from 'electron';
import {
  ACTIVE_SHEET_CHANGELOG_RECENT_ONLY,
  setActiveSheet,
} from '../reducers/application';
import {Logger} from '../fb-interfaces/Logger';
import {State as Store} from '../reducers/index';
import {StaticView} from '../reducers/connections';
import StatusBar from './StatusBar';
import {hasNewChangesToShow} from './ChangelogSheet';
import QPL, {QuickLogActionType, FLIPPER_QPL_EVENTS} from '../fb-stubs/QPL';
import {SheetRenderer} from './SheetRenderer';

const version = remote.app.getVersion();

type OwnProps = {
  logger: Logger;
};

type StateFromProps = {
  leftSidebarVisible: boolean;
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

export function registerStartupTime(logger: Logger) {
  // track time since launch
  const [s, ns] = process.hrtime();
  const launchEndTime = s * 1e3 + ns / 1e6;
  ipcRenderer.on('getLaunchTime', (_: any, launchStartTime: number) => {
    logger.track('performance', 'launchTime', launchEndTime - launchStartTime);

    QPL.markerStart(FLIPPER_QPL_EVENTS.STARTUP, 0, launchStartTime);
    QPL.markerEnd(
      FLIPPER_QPL_EVENTS.STARTUP,
      QuickLogActionType.SUCCESS,
      0,
      launchEndTime,
    );
  });

  ipcRenderer.send('getLaunchTime');
  ipcRenderer.send('componentDidMount');
}

export class LegacyApp extends React.Component<Props> {
  componentDidMount() {
    registerStartupTime(this.props.logger);
    if (hasNewChangesToShow(window.localStorage)) {
      this.props.setActiveSheet(ACTIVE_SHEET_CHANGELOG_RECENT_ONLY);
    }
  }

  render() {
    return (
      <Layout.Top>
        <Layout.Top>
          <>
            <TitleBar version={version} />
            <DoctorBar />
          </>
          <>
            <SheetRenderer logger={this.props.logger} />
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
              <div>
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
              </div>
            </PluginContent>
          </Layout.Left>
          <StatusBar />
        </Layout.Bottom>
      </Layout.Top>
    );
  }
}

export default connect<StateFromProps, DispatchProps, OwnProps, Store>(
  ({application: {leftSidebarVisible}, connections: {staticView}}) => ({
    leftSidebarVisible,
    staticView,
  }),
  {
    setActiveSheet,
  },
)(LegacyApp);
