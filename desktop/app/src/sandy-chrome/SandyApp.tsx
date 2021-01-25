/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useEffect, useState, useCallback} from 'react';
import {TrackingScope, useLogger} from 'flipper-plugin';
import {styled} from '../ui';
import {Layout, Sidebar} from '../ui';
import {theme} from 'flipper-plugin';
import {ipcRenderer} from 'electron';
import {Logger} from '../fb-interfaces/Logger';

import {LeftRail} from './LeftRail';
import {useStore, useDispatch} from '../utils/useStore';
import {ConsoleLogs} from '../chrome/ConsoleLogs';
import {setStaticView} from '../reducers/connections';
import {
  ACTIVE_SHEET_CHANGELOG_RECENT_ONLY,
  setActiveSheet,
  toggleLeftSidebarVisible,
} from '../reducers/application';
import {AppInspect} from './appinspect/AppInspect';
import PluginContainer from '../PluginContainer';
import {ContentContainer} from './ContentContainer';
import {Notification} from './notification/Notification';
import {SheetRenderer} from '../chrome/SheetRenderer';
import {hasNewChangesToShow} from '../chrome/ChangelogSheet';
import {SandyWelcomeScreen} from './SandyWelcomeScreen';
import {getVersionString} from '../utils/versionString';
import config from '../fb-stubs/config';
import {WelcomeScreenStaticView} from './WelcomeScreen';
import QPL, {QuickLogActionType, FLIPPER_QPL_EVENTS} from '../fb-stubs/QPL';
import fbConfig from '../fb-stubs/config';
import {isFBEmployee} from '../utils/fbEmployee';
import {notification} from 'antd';
import isProduction from '../utils/isProduction';

export type ToplevelNavItem =
  | 'appinspect'
  | 'flipperlogs'
  | 'notification'
  | undefined;
export type ToplevelProps = {
  toplevelSelection: ToplevelNavItem;
  setToplevelSelection: (_newSelection: ToplevelNavItem) => void;
};

export function SandyApp() {
  const logger = useLogger();
  const dispatch = useDispatch();
  const leftSidebarVisible = useStore(
    (state) => state.application.leftSidebarVisible,
  );
  const staticView = useStore((state) => state.connections.staticView);

  /**
   * top level navigation uses two pieces of state, selection stored here, and selection that is based on what is stored in the reducer (which might be influenced by redux action dispatches to different means).
   * The logic here is to sync both, but without modifying the navigation related reducers to not break classic Flipper.
   * It is possible to simplify this in the future.
   */
  const [toplevelSelection, setStoredToplevelSelection] = useState<
    ToplevelNavItem
  >('appinspect');

  // Handle toplevel nav clicks from LeftRail
  const setToplevelSelection = useCallback(
    (newSelection: ToplevelNavItem) => {
      // toggle sidebar visibility if needed
      const hasLeftSidebar =
        newSelection === 'appinspect' || newSelection === 'notification';
      if (hasLeftSidebar) {
        if (newSelection === toplevelSelection) {
          dispatch(toggleLeftSidebarVisible());
        } else {
          dispatch(toggleLeftSidebarVisible(true));
        }
      }
      switch (newSelection) {
        case 'flipperlogs':
          dispatch(setStaticView(ConsoleLogs));
          break;
        default:
      }
      setStoredToplevelSelection(newSelection);
    },
    [dispatch, toplevelSelection],
  );

  useEffect(() => {
    document.title = `Flipper (${getVersionString()}${
      config.isFBBuild ? '@FB' : ''
    })`;

    registerStartupTime(logger);
    if (hasNewChangesToShow(window.localStorage)) {
      dispatch(setActiveSheet(ACTIVE_SHEET_CHANGELOG_RECENT_ONLY));
    }
    // don't warn about logger, even with a new logger we don't want to re-register
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (fbConfig.warnFBEmployees && isProduction()) {
      isFBEmployee().then((isEmployee) => {
        if (isEmployee) {
          notification.warning({
            placement: 'bottomLeft',
            message: 'Please use Flipper@FB',
            description: (
              <>
                You are using the open-source version of Flipper. Install the
                internal build from Managed Software Center to get access to
                more plugins.
              </>
            ),
            duration: null,
          });
        }
      });
    }
  }, []);

  const leftMenuContent = !leftSidebarVisible ? null : toplevelSelection ===
    'appinspect' ? (
    <AppInspect />
  ) : toplevelSelection === 'notification' ? (
    <Notification />
  ) : null;

  return (
    <Layout.Top>
      <>
        <SheetRenderer logger={logger} />
        <SandyWelcomeScreen />
      </>
      <Layout.Left>
        <Layout.Horizontal>
          <LeftRail
            toplevelSelection={toplevelSelection}
            setToplevelSelection={setToplevelSelection}
          />
          <Sidebar width={250} minWidth={220} maxWidth={800} gutter>
            {leftMenuContent && (
              <TrackingScope scope={toplevelSelection!}>
                {leftMenuContent}
              </TrackingScope>
            )}
          </Sidebar>
        </Layout.Horizontal>
        <MainContainer>
          {outOfContentsContainer}
          {staticView ? (
            <TrackingScope
              scope={
                (staticView as any).displayName ??
                staticView.name ??
                staticView.constructor?.name ??
                'unknown static view'
              }>
              {staticView === WelcomeScreenStaticView ? (
                React.createElement(staticView) /* avoid shadow */
              ) : (
                <ContentContainer>
                  {React.createElement(staticView, {
                    logger: logger,
                  })}
                </ContentContainer>
              )}
            </TrackingScope>
          ) : (
            <PluginContainer logger={logger} isSandy />
          )}
        </MainContainer>
      </Layout.Left>
    </Layout.Top>
  );
}

const outOfContentsContainer = (
  <div
    style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      display: 'none',
    }}>
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
);

const MainContainer = styled(Layout.Container)({
  background: theme.backgroundWash,
  padding: `${theme.space.large}px ${theme.space.large}px ${theme.space.large}px 0`,
});

function registerStartupTime(logger: Logger) {
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
