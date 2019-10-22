/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlexColumn, Button, styled, Text, FlexRow, Spacer} from 'flipper';
import React, {Component} from 'react';
import {updateSettings, Action} from '../reducers/settings';
import {connect} from 'react-redux';
import {State as Store} from '../reducers';
import {Settings} from '../reducers/settings';
import {flush} from '../utils/persistor';
import ToggledSection from './settings/ToggledSection';
import {FilePathConfigField, ConfigText} from './settings/configFields';
import isEqual from 'lodash.isequal';
import restartFlipper from '../utils/restartFlipper';

const Container = styled(FlexColumn)({
  padding: 20,
  width: 800,
});

const Title = styled(Text)({
  marginBottom: 18,
  marginRight: 10,
  fontWeight: 100,
  fontSize: '40px',
});

type OwnProps = {
  onHide: () => void;
};

type StateFromProps = {
  settings: Settings;
  isXcodeDetected: boolean;
};

type DispatchFromProps = {
  updateSettings: (settings: Settings) => Action;
};

type State = {
  updatedSettings: Settings;
};

type Props = OwnProps & StateFromProps & DispatchFromProps;
class SettingsSheet extends Component<Props, State> {
  state: State = {
    updatedSettings: {...this.props.settings},
  };

  applyChanges = async () => {
    this.props.updateSettings(this.state.updatedSettings);
    this.props.onHide();
    flush().then(() => {
      restartFlipper();
    });
  };

  render() {
    return (
      <Container>
        <Title>Settings</Title>
        <ToggledSection
          label="Android Developer"
          toggled={this.state.updatedSettings.enableAndroid}
          onChange={v => {
            this.setState({
              updatedSettings: {
                ...this.state.updatedSettings,
                enableAndroid: v,
              },
            });
          }}>
          <FilePathConfigField
            label="Android SDK Location"
            defaultValue={this.state.updatedSettings.androidHome}
            onChange={v => {
              this.setState({
                updatedSettings: {
                  ...this.state.updatedSettings,
                  androidHome: v,
                },
              });
            }}
          />
        </ToggledSection>
        <ToggledSection
          label="iOS Developer"
          toggled={this.props.isXcodeDetected}
          frozen>
          {' '}
          <ConfigText
            content={
              'Use xcode-select to enable or switch between xcode versions'
            }
            frozen
          />
        </ToggledSection>
        <br />
        <FlexRow>
          <Spacer />
          <Button compact padded onClick={this.props.onHide}>
            Cancel
          </Button>
          <Button
            disabled={isEqual(this.props.settings, this.state.updatedSettings)}
            type="primary"
            compact
            padded
            onClick={this.applyChanges}>
            Apply and Restart
          </Button>
        </FlexRow>
      </Container>
    );
  }
}

export default connect<StateFromProps, DispatchFromProps, OwnProps, Store>(
  ({settingsState, application}) => ({
    settings: settingsState,
    isXcodeDetected: application.xcodeCommandLineToolsDetected,
  }),
  {updateSettings},
)(SettingsSheet);
