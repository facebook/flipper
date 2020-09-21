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
import {styled, colors} from 'flipper';
import {Button} from 'antd';
import {CloseCircleOutlined} from '@ant-design/icons';

type StateFromProps = {settings: Settings};
type DispatchFromProps = {disableSandy: (settings: Settings) => void};
type OwnProps = {};

type Props = StateFromProps & DispatchFromProps & OwnProps;

// This component should be dropped, and insetTitlebar should be removed from Electron startup once Sandy is the default
const TemporarilyTitlebarContainer = styled('div')<{focused?: boolean}>(
  ({focused}) => ({
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
  }),
);

export const TemporarilyTitlebar = connect<
  StateFromProps,
  DispatchFromProps,
  OwnProps,
  Store
>(
  ({settingsState}) => ({settings: settingsState}),
  (dispatch) => ({
    disableSandy: (settings: Settings) => {
      console.log(settings);
      dispatch(updateSettings({...settings, enableSandy: false}));
    },
  }),
)((props: Props) => (
  <TemporarilyTitlebarContainer focused /*TODO: make dynamic */>
    [Sandy] Flipper{' '}
    <Button
      size="small"
      type="link"
      icon={<CloseCircleOutlined />}
      onClick={() => props.disableSandy(props.settings)}></Button>
  </TemporarilyTitlebarContainer>
));
