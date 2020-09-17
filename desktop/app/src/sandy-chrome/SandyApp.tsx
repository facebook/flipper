/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {connect} from 'react-redux';
import {State as Store} from '../reducers';
import {Settings, updateSettings} from '../reducers/settings';
import {styled, FlexColumn, colors, Text} from 'flipper';
import {DatePicker, Button} from 'antd';
import {Layout, FlexBox} from '../ui';
import {theme} from './theme';

import {LeftRail} from './LeftRail';
import {CloseCircleOutlined} from '@ant-design/icons';

type StateFromProps = {settings: Settings};
type DispatchFromProps = {disableSandy: (settings: Settings) => void};
type OwnProps = {};

type Props = StateFromProps & DispatchFromProps & OwnProps;

const Container = styled(FlexColumn)({
  height: '100%',
  width: '100%',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: colors.light02,
});

const Box = styled(FlexColumn)({
  justifyContent: 'center',
  alignItems: 'center',
  background: colors.white,
  borderRadius: 10,
  boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
  paddingBottom: 16,
});

const AnnoucementText = styled(Text)({
  fontSize: 24,
  fontWeight: 300,
  textAlign: 'center',
  margin: 16,
  color: theme.primaryColor,
  background: theme.backgroundWash,
});

const LeftContainer = styled(FlexBox)({
  height: '100% ',
});

// This component should be dropped, and insetTitlebar should be removed from Electron startup once Sandy is the default
const TemporarilyTitlebar = styled('div')<{focused?: boolean}>(({focused}) => ({
  textAlign: 'center',
  userSelect: 'none',
  height: '38px',
  lineHeight: '38px',
  fontSize: '10pt',
  color: colors.macOSTitleBarIcon,
  background: true
    ? `linear-gradient(to bottom, ${colors.macOSTitleBarBackgroundTop} 0%, ${colors.macOSTitleBarBackgroundBottom} 100%)`
    : colors.macOSTitleBarBackgroundBlur,
  borderBottom: `1px solid ${
    focused ? colors.macOSTitleBarBorder : colors.macOSTitleBarBorderBlur
  }`,
  WebkitAppRegion: 'drag',
}));

function SandyApp(props: Props) {
  return (
    <Layout.Top>
      <TemporarilyTitlebar focused /*TODO: make dynamic */>
        [Sandy] Flipper{' '}
        <Button
          size="small"
          type="link"
          icon={<CloseCircleOutlined />}
          onClick={() => props.disableSandy(props.settings)}></Button>
      </TemporarilyTitlebar>
      <Layout.Left>
        <LeftContainer>
          <LeftRail />
          <LeftMenu />
        </LeftContainer>
        <Layout.Right>
          <MainContainer>
            <TemporarilyContent />
          </MainContainer>
          <RightMenu />
        </Layout.Right>
      </Layout.Left>
    </Layout.Top>
  );
}

function LeftMenu() {
  return <div>LeftMenu</div>;
}

function RightMenu() {
  return <div>RightMenu</div>;
}

function MainContainer({children}: any) {
  return (
    <div>
      MainContainer
      <br />
      {children}
    </div>
  );
}

function TemporarilyContent() {
  return (
    <Container>
      <Box>
        <AnnoucementText>
          New UI for Flipper, Sandy Project! Nothing to see now. Go back to
          current Flipper
        </AnnoucementText>
        <DatePicker />
      </Box>
    </Container>
  );
}

export default connect<StateFromProps, DispatchFromProps, OwnProps, Store>(
  ({settingsState}) => ({settings: settingsState}),
  (dispatch) => ({
    disableSandy: (settings: Settings) => {
      console.log(settings);
      dispatch(updateSettings({...settings, enableSandy: false}));
    },
  }),
)(SandyApp);
