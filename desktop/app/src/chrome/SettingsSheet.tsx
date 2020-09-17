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
import {
  Action as LauncherAction,
  LauncherSettings,
  updateLauncherSettings,
} from '../reducers/launcherSettings';
import {connect} from 'react-redux';
import {State as Store} from '../reducers';
import {Settings, DEFAULT_ANDROID_SDK_PATH} from '../reducers/settings';
import {flush} from '../utils/persistor';
import ToggledSection from './settings/ToggledSection';
import {FilePathConfigField, ConfigText} from './settings/configFields';
import KeyboardShortcutInput from './settings/KeyboardShortcutInput';
import {isEqual} from 'lodash';
import restartFlipper from '../utils/restartFlipper';
import LauncherSettingsPanel from '../fb-stubs/LauncherSettingsPanel';
import SandySettingsPanel from '../fb-stubs/SandySettingsPanel';
import {reportUsage} from '../utils/metrics';

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
  platform: NodeJS.Platform;
};

type StateFromProps = {
  settings: Settings;
  launcherSettings: LauncherSettings;
  isXcodeDetected: boolean;
};

type DispatchFromProps = {
  updateSettings: (settings: Settings) => Action;
  updateLauncherSettings: (settings: LauncherSettings) => LauncherAction;
};

type State = {
  updatedSettings: Settings;
  updatedLauncherSettings: LauncherSettings;
};

type Props = OwnProps & StateFromProps & DispatchFromProps;
class SettingsSheet extends Component<Props, State> {
  state: State = {
    updatedSettings: {...this.props.settings},
    updatedLauncherSettings: {...this.props.launcherSettings},
  };

  componentDidMount() {
    reportUsage('settings:opened');
  }

  applyChanges = async () => {
    this.props.updateSettings(this.state.updatedSettings);
    this.props.updateLauncherSettings(this.state.updatedLauncherSettings);
    this.props.onHide();
    flush().then(() => {
      restartFlipper();
    });
  };

  applyChangesWithoutRestart = async () => {
    this.props.updateSettings(this.state.updatedSettings);
    this.props.updateLauncherSettings(this.state.updatedLauncherSettings);
    await flush();
    this.props.onHide();
  };

  render() {
    const {
      enableAndroid,
      androidHome,
      enableIOS,
      enablePhysicalIOS,
      enablePrefetching,
      idbPath,
      reactNative,
      enableSandy,
      darkMode,
    } = this.state.updatedSettings;

    const settingsPristine =
      isEqual(this.props.settings, this.state.updatedSettings) &&
      isEqual(this.props.launcherSettings, this.state.updatedLauncherSettings);

    return (
      <Container>
        <Title>Settings</Title>
        <ToggledSection
          label="Android Developer"
          toggled={enableAndroid}
          onChange={(v) => {
            this.setState({
              updatedSettings: {
                ...this.state.updatedSettings,
                enableAndroid: v,
              },
            });
          }}>
          <FilePathConfigField
            label="Android SDK location"
            resetValue={DEFAULT_ANDROID_SDK_PATH}
            defaultValue={androidHome}
            onChange={(v) => {
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
          toggled={enableIOS && this.props.platform === 'darwin'}
          frozen={this.props.platform !== 'darwin'}
          onChange={(v) => {
            this.setState({
              updatedSettings: {...this.state.updatedSettings, enableIOS: v},
            });
          }}>
          {' '}
          {this.props.platform === 'darwin' && (
            <ConfigText
              content={'Use "xcode-select" to switch between Xcode versions'}
            />
          )}
          {this.props.platform !== 'darwin' && (
            <ConfigText
              content={'iOS development is only supported on MacOS'}
            />
          )}
          <ToggledSection
            label="Enable physical iOS devices"
            toggled={enablePhysicalIOS}
            frozen={false}
            onChange={(v) => {
              this.setState({
                updatedSettings: {
                  ...this.state.updatedSettings,
                  enablePhysicalIOS: v,
                },
              });
            }}>
            <FilePathConfigField
              label="IDB binary location"
              defaultValue={idbPath}
              isRegularFile={true}
              onChange={(v) => {
                this.setState({
                  updatedSettings: {...this.state.updatedSettings, idbPath: v},
                });
              }}
            />
          </ToggledSection>
        </ToggledSection>
        <LauncherSettingsPanel
          isPrefetchingEnabled={enablePrefetching}
          onEnablePrefetchingChange={(v) => {
            this.setState({
              updatedSettings: {
                ...this.state.updatedSettings,
                enablePrefetching: v,
              },
            });
          }}
          isLocalPinIgnored={this.state.updatedLauncherSettings.ignoreLocalPin}
          onIgnoreLocalPinChange={(v) => {
            this.setState({
              updatedLauncherSettings: {
                ...this.state.updatedLauncherSettings,
                ignoreLocalPin: v,
              },
            });
          }}
        />
        <SandySettingsPanel
          toggled={this.state.updatedSettings.enableSandy}
          onChange={(v) => {
            this.setState({
              updatedSettings: {
                ...this.state.updatedSettings,
                enableSandy: v,
              },
            });
          }}
        />
        {enableSandy && (
          <ToggledSection
            label="Enable dark theme"
            toggled={darkMode}
            onChange={(enabled) => {
              this.setState((prevState) => ({
                updatedSettings: {
                  ...prevState.updatedSettings,
                  darkMode: enabled,
                },
              }));
            }}
          />
        )}
        <ToggledSection
          label="React Native keyboard shortcuts"
          toggled={reactNative.shortcuts.enabled}
          onChange={(enabled) => {
            this.setState((prevState) => ({
              updatedSettings: {
                ...prevState.updatedSettings,
                reactNative: {
                  ...prevState.updatedSettings.reactNative,
                  shortcuts: {
                    ...prevState.updatedSettings.reactNative.shortcuts,
                    enabled,
                  },
                },
              },
            }));
          }}>
          <KeyboardShortcutInput
            label="Reload application"
            value={reactNative.shortcuts.reload}
            onChange={(reload) => {
              this.setState((prevState) => ({
                updatedSettings: {
                  ...prevState.updatedSettings,
                  reactNative: {
                    ...prevState.updatedSettings.reactNative,
                    shortcuts: {
                      ...prevState.updatedSettings.reactNative.shortcuts,
                      reload,
                    },
                  },
                },
              }));
            }}
          />
          <KeyboardShortcutInput
            label="Open developer menu"
            value={reactNative.shortcuts.openDevMenu}
            onChange={(openDevMenu) => {
              this.setState((prevState) => ({
                updatedSettings: {
                  ...prevState.updatedSettings,
                  reactNative: {
                    ...prevState.updatedSettings.reactNative,
                    shortcuts: {
                      ...prevState.updatedSettings.reactNative.shortcuts,
                      openDevMenu,
                    },
                  },
                },
              }));
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
            disabled={settingsPristine}
            compact
            padded
            onClick={this.applyChangesWithoutRestart}>
            Apply
          </Button>
          <Button
            disabled={settingsPristine}
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
  ({settingsState, launcherSettingsState, application}) => ({
    settings: settingsState,
    launcherSettings: launcherSettingsState,
    isXcodeDetected: application.xcodeCommandLineToolsDetected,
  }),
  {updateSettings, updateLauncherSettings},
)(SettingsSheet);
