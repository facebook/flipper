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
import {DatePicker, Space} from 'antd';
import {Layout, FlexRow, Sidebar} from '../ui';
import {theme} from './theme';
import {Logger} from '../fb-interfaces/Logger';

import {LeftRail} from './LeftRail';
import {TemporarilyTitlebar} from './TemporarilyTitlebar';
import TypographyExample from './TypographyExample';
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
          <LeftSidebarContainer>
            <LeftRail
              toplevelSelection={toplevelSelection}
              setToplevelSelection={setToplevelSelection}
            />
            <Sidebar width={348} minWidth={220} maxWidth={800} gutter>
              {leftMenuContent && (
                <LeftMenuContainer>{leftMenuContent}</LeftMenuContainer>
              )}
            </Sidebar>
          </LeftSidebarContainer>
          <MainContainer>
            <Layout.Right>
              <MainContentWrapper>
                <ContentContainer>
                  {staticView ? (
                    React.createElement(staticView, {
                      logger: logger,
                    })
                  ) : (
                    <TemporarilyContent />
                  )}
                </ContentContainer>
              </MainContentWrapper>
              <Sidebar
                width={300}
                minWidth={220}
                maxWidth={800}
                gutter
                position="right">
                <MainContentWrapper>
                  <ContentContainer>
                    <RightMenu />
                  </ContentContainer>
                </MainContentWrapper>
              </Sidebar>
            </Layout.Right>
          </MainContainer>
        </Layout.Left>
      </Layout.Top>
    </SandyContext.Provider>
  );
}

const LeftMenuContainer = styled.div({
  background: theme.backgroundDefault,
  paddingRight: 1, // to see the boxShadow
  boxShadow: 'inset -1px 0px 0px rgba(0, 0, 0, 0.1)',
  height: '100%',
  width: '100%',
});

const LeftSidebarContainer = styled(FlexRow)({
  background: theme.backgroundWash,
  height: '100%',
  width: '100%',
});

const MainContainer = styled('div')({
  display: 'flex',
  width: '100%',
  height: '100%',
  background: theme.backgroundWash,
  paddingRight: theme.space.middle,
});

export const ContentContainer = styled('div')({
  width: '100%',
  margin: 0,
  padding: 0,
  background: theme.backgroundDefault,
  border: `1px solid ${theme.dividerColor}`,
  borderRadius: theme.containerBorderRadius,
  boxShadow: `0px 0px 5px rgba(0, 0, 0, 0.05), 0px 0px 1px rgba(0, 0, 0, 0.05)`,
});

const MainContentWrapper = styled('div')({
  height: '100%',
  width: '100%',
  display: 'flex',
  alignItems: 'stretch',
  padding: `${theme.space.middle}px 0`,
});

function RightMenu() {
  return <div>RightMenu</div>;
}

function TemporarilyContent() {
  return (
    <Space direction="vertical">
      New UI for Flipper, Sandy Project! Nothing to see now. Go back to current
      Flipper
      <DatePicker />
      <TypographyExample />
    </Space>
  );
}
