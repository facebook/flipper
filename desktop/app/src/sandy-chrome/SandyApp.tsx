/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {styled} from 'flipper';
import {DatePicker} from 'antd';
import {Layout, FlexRow} from '../ui';
import {theme} from './theme';

import {LeftRail} from './LeftRail';
import {TemporarilyTitlebar} from './TemporarilyTitlebar';

export function SandyApp() {
  return (
    <Layout.Top>
      <TemporarilyTitlebar />
      <Layout.Left initialSize={348} minSize={200}>
        <LeftMenu>
          <LeftRail />
          <div>LeftMenu</div>
        </LeftMenu>
        <MainContainer>
          <Layout.Right initialSize={300} minSize={200}>
            <MainContentWrapper>
              <ContentContainer>
                <TemporarilyContent />
              </ContentContainer>
            </MainContentWrapper>
            <MainContentWrapper>
              <ContentContainer>
                <RightMenu />
              </ContentContainer>
            </MainContentWrapper>
          </Layout.Right>
        </MainContainer>
      </Layout.Left>
    </Layout.Top>
  );
}

const LeftMenu = styled(FlexRow)({
  boxShadow: `inset -1px 0px 0px ${theme.dividerColor}`,
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
  borderRadius: theme.space.small,
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
    <>
      New UI for Flipper, Sandy Project! Nothing to see now. Go back to current
      Flipper
      <DatePicker />
    </>
  );
}
