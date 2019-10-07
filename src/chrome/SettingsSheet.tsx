/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {
  FlexColumn,
  Button,
  styled,
  Text,
  FlexRow,
  Spacer,
  Input,
  colors,
  Glyph,
} from 'flipper';
import React, {Component, useState} from 'react';
import {updateSettings, Action} from '../reducers/settings';
import {connect} from 'react-redux';
import {State as Store} from '../reducers';
import {Settings} from '../reducers/settings';
import {promises as fs} from 'fs';
import {remote} from 'electron';
import path from 'path';

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

const InfoText = styled(Text)({
  lineHeight: 1.35,
  paddingTop: 5,
});

const FileInputBox = styled(Input)(({isValid}: {isValid: boolean}) => ({
  marginRight: 0,
  flexGrow: 1,
  fontFamily: 'monospace',
  color: isValid ? undefined : colors.red,
  marginLeft: 10,
  marginTop: 'auto',
  marginBottom: 'auto',
}));

const CenteredGlyph = styled(Glyph)({
  margin: 'auto',
  marginLeft: 10,
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

function FilePathConfigField(props: {
  label: string;
  defaultValue: string;
  onChange: (path: string) => void;
}) {
  const [value, setValue] = useState(props.defaultValue);
  const [isValid, setIsValid] = useState(true);
  fs.stat(value)
    .then(stat => setIsValid(stat.isDirectory()))
    .catch(_ => setIsValid(false));
  return (
    <FlexRow>
      <InfoText>{props.label}</InfoText>
      <FileInputBox
        placeholder={props.label}
        value={value}
        isValid={isValid}
        onChange={e => {
          setValue(e.target.value);
          props.onChange(e.target.value);
          fs.stat(e.target.value)
            .then(stat => setIsValid(stat.isDirectory()))
            .catch(_ => setIsValid(false));
        }}
      />
      <FlexColumn
        onClick={() =>
          remote.dialog.showOpenDialog(
            {
              properties: ['openDirectory', 'showHiddenFiles'],
              defaultPath: path.resolve('/'),
            },
            (paths: Array<string> | undefined) => {
              paths && setValue(paths[0]);
              paths && props.onChange(paths[0]);
            },
          )
        }>
        <CenteredGlyph name="dots-3-circle" variant="outline" />
      </FlexColumn>
      {isValid ? null : (
        <CenteredGlyph name="caution-triangle" color={colors.yellow} />
      )}
    </FlexRow>
  );
}

type Props = OwnProps & StateFromProps & DispatchFromProps;
class SignInSheet extends Component<Props, State> {
  state = {
    updatedSettings: {...this.props.settings},
  };

  applyChanges = async () => {
    this.props.updateSettings(this.state.updatedSettings);
    this.props.onHide();
  };

  render() {
    return (
      <Container>
        <Title>Settings</Title>
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
        <br />
        <FlexRow>
          <Spacer />
          <Button compact padded onClick={this.props.onHide}>
            Cancel
          </Button>
          <Button type="primary" compact padded onClick={this.applyChanges}>
            Apply
          </Button>
        </FlexRow>
      </Container>
    );
  }
}

export default connect<StateFromProps, DispatchFromProps, OwnProps, Store>(
  ({settingsState}) => ({settings: settingsState}),
  {updateSettings},
)(SignInSheet);
