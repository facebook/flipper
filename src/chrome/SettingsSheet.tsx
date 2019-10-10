/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
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
import {FilePathConfigField} from './settings/configFields';
import {remote} from 'electron';
import isEqual from 'lodash.isequal';

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
      remote.app.relaunch();
      remote.app.exit();
    });
  };

  render() {
    return (
      <Container>
        <Title>Settings</Title>
        <ToggledSection
          label="Android"
          enabled={this.state.updatedSettings.enableAndroid}
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
  ({settingsState}) => ({settings: settingsState}),
  {updateSettings},
)(SettingsSheet);
