/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useEffect, useState, useCallback} from 'react';
import {styled} from 'flipper';
import {Layout, Sidebar} from '../ui';
import {theme} from './theme';
import {Logger} from '../fb-interfaces/Logger';

import {LeftRail} from './LeftRail';
import {TemporarilyTitlebar} from './TemporarilyTitlebar';
import SandyDesignSystem from './SandyDesignSystem';
import {registerStartupTime} from '../App';
import {useStore, useDispatch} from '../utils/useStore';
import {SandyContext} from './SandyContext';
import {ConsoleLogs} from '../chrome/ConsoleLogs';
import {setStaticView} from '../reducers/connections';
import {toggleLeftSidebarVisible} from '../reducers/application';
import {AppInspect} from './AppInspect';

export type ToplevelNavItem = 'appinspect' | 'flipperlogs' | undefined;
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
      const hasLeftSidebar = newSelection === 'appinspect';
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
    // don't warn about logger, even with a new logger we don't want to re-register
    // eslint-disable-next-line
  }, []);

  const leftMenuContent =
    leftSidebarVisible && toplevelSelection === 'appinspect' ? (
      <AppInspect />
    ) : null;

  return (
    <SandyContext.Provider value={true}>
      <Layout.Top>
        <TemporarilyTitlebar />
        <Layout.Left>
          <Layout.Horizontal>
            <LeftRail
              toplevelSelection={toplevelSelection}
              setToplevelSelection={setToplevelSelection}
            />
            <Sidebar width={250} minWidth={220} maxWidth={800} gutter>
              {leftMenuContent && (
                <Layout.Container borderRight>
                  {leftMenuContent}
                </Layout.Container>
              )}
            </Sidebar>
          </Layout.Horizontal>
          <MainContainer>
            <ContentContainer>
              {staticView ? (
                React.createElement(staticView, {
                  logger: logger,
                })
              ) : (
                <SandyDesignSystem />
              )}
            </ContentContainer>
            <Sidebar
              width={300}
              minWidth={220}
              maxWidth={800}
              gutter
              position="right">
              <ContentContainer style={{marginRight: theme.space.large}}>
                <RightMenu />
              </ContentContainer>
            </Sidebar>
          </MainContainer>
        </Layout.Left>
      </Layout.Top>
    </SandyContext.Provider>
  );
}

const MainContainer = styled(Layout.Right)({
  background: theme.backgroundWash,
});

export const ContentContainer = styled(Layout.Container)({
  background: theme.backgroundDefault,
  border: `1px solid ${theme.dividerColor}`,
  borderRadius: theme.containerBorderRadius,
  boxShadow: `0px 0px 5px rgba(0, 0, 0, 0.05), 0px 0px 1px rgba(0, 0, 0, 0.05)`,
  marginTop: theme.space.large,
  marginBottom: theme.space.large,
});

function RightMenu() {
  return <div>RightMenu</div>;
}
