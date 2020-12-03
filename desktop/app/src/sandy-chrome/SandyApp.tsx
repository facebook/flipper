/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useEffect, useState, useCallback} from 'react';
import {TrackingScope} from 'flipper-plugin';
import {styled} from '../ui';
import {Layout, Sidebar} from '../ui';
import {theme} from 'flipper-plugin';
import {Logger} from '../fb-interfaces/Logger';

import {LeftRail} from './LeftRail';
import {TemporarilyTitlebar} from './TemporarilyTitlebar';
import {registerStartupTime} from '../App';
import {useStore, useDispatch} from '../utils/useStore';
import {SandyContext} from './SandyContext';
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
import {SandyWelcomScreen} from './SandyWelcomeScreen';

export type ToplevelNavItem =
  | 'appinspect'
  | 'flipperlogs'
  | 'notification'
  | undefined;
export type ToplevelProps = {
  toplevelSelection: ToplevelNavItem;
  setToplevelSelection: (_newSelection: ToplevelNavItem) => void;
};

export function SandyApp({logger}: {logger: Logger}) {
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
    registerStartupTime(logger);
    if (hasNewChangesToShow(window.localStorage)) {
      dispatch(setActiveSheet(ACTIVE_SHEET_CHANGELOG_RECENT_ONLY));
    }
    // don't warn about logger, even with a new logger we don't want to re-register
    // eslint-disable-next-line
  }, []);

  const leftMenuContent = !leftSidebarVisible ? null : toplevelSelection ===
    'appinspect' ? (
    <AppInspect />
  ) : toplevelSelection === 'notification' ? (
    <Notification />
  ) : null;

  return (
    <SandyContext.Provider value={true}>
      <Layout.Top>
        <>
          <TemporarilyTitlebar />
          <SheetRenderer logger={logger} />
          <SandyWelcomScreen />
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
                  staticView.displayName ??
                  staticView.name ??
                  staticView.constructor?.name ??
                  'unknown static view'
                }>
                <ContentContainer>
                  {React.createElement(staticView, {
                    logger: logger,
                  })}
                </ContentContainer>
              </TrackingScope>
            ) : (
              <PluginContainer logger={logger} isSandy />
            )}
          </MainContainer>
        </Layout.Left>
      </Layout.Top>
    </SandyContext.Provider>
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
