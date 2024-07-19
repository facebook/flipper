/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {Component, useContext} from 'react';
import {Radio} from 'antd';
import {updateSettings, Action} from '../reducers/settings';
import {
  Action as LauncherAction,
  updateLauncherSettings,
} from '../reducers/launcherSettings';
import {connect} from 'react-redux';
import {State as Store} from '../reducers';
import {flush} from '../utils/persistor';
import ToggledSection from './settings/ToggledSection';
import {
  FilePathConfigField,
  ConfigText,
  URLConfigField,
} from './settings/configFields';
import {isEqual, isMatch, isEmpty} from 'lodash';
import LauncherSettingsPanel from '../fb-stubs/LauncherSettingsPanel';
import {
  LauncherSettings,
  Platform,
  reportUsage,
  Settings,
  sleep,
} from 'flipper-common';
import {Modal, message, Button} from 'antd';
import {
  Layout,
  withTrackingScope,
  _NuxManagerContext,
  NUX,
} from 'flipper-plugin';
import {loadTheme} from '../utils/loadTheme';
import {getFlipperServer, getFlipperServerConfig} from '../flipperServer';

type OwnProps = {
  onHide: () => void;
  platform: Platform;
  isFB: boolean;
  noModal?: boolean; // used for testing
};

type StateFromProps = {
  settings: Settings;
  launcherSettings: LauncherSettings;
};

type DispatchFromProps = {
  updateSettings: (settings: Settings) => Action;
  updateLauncherSettings: (settings: LauncherSettings) => LauncherAction;
};

type State = {
  updatedSettings: Settings;
  updatedLauncherSettings: LauncherSettings;
  forcedRestartSettings: Partial<Settings>;
  forcedRestartLauncherSettings: Partial<LauncherSettings>;
};

type Props = OwnProps & StateFromProps & DispatchFromProps;
class SettingsSheet extends Component<Props, State> {
  state: State = {
    updatedSettings: {...this.props.settings},
    updatedLauncherSettings: {...this.props.launcherSettings},
    forcedRestartSettings: {},
    forcedRestartLauncherSettings: {},
  };

  componentDidMount() {
    reportUsage('settings:opened');
  }

  applyChanges = async () => {
    this.props.updateSettings(this.state.updatedSettings);
    this.props.updateLauncherSettings(this.state.updatedLauncherSettings);
    this.props.onHide();
    await flush();
    await sleep(1000);
    if (this.props.platform === 'darwin' && this.props.isFB) {
      getFlipperServer().exec('restart');
    } else {
      getFlipperServer().exec('shutdown');
    }
    window.close();
  };

  applyChangesWithoutRestart = async () => {
    this.props.updateSettings(this.state.updatedSettings);
    this.props.updateLauncherSettings(this.state.updatedLauncherSettings);
    await flush();
    this.props.onHide();
  };

  renderSandyContainer(
    contents: React.ReactElement,
    footer: React.ReactElement,
  ) {
    return (
      <Modal
        open
        centered
        onCancel={this.props.onHide}
        width={570}
        title="Settings"
        footer={footer}
        bodyStyle={{
          overflow: 'auto',
          maxHeight: 'calc(100vh - 250px)',
        }}>
        {contents}
      </Modal>
    );
  }

  render() {
    const {
      enableAndroid,
      androidHome,
      enableIOS,
      enablePhysicalIOS,
      enablePrefetching,
      idbPath,
      darkMode,
      suppressPluginErrors,
      persistDeviceData,
      enablePluginMarketplace,
      enablePluginMarketplaceAutoUpdate,
      marketplaceURL,
    } = this.state.updatedSettings;
    const settingsPristine =
      isEqual(this.props.settings, this.state.updatedSettings) &&
      isEqual(this.props.launcherSettings, this.state.updatedLauncherSettings);

    const forcedRestart =
      (!isEmpty(this.state.forcedRestartSettings) &&
        !isMatch(this.props.settings, this.state.forcedRestartSettings)) ||
      (!isEmpty(this.state.forcedRestartLauncherSettings) &&
        !isMatch(
          this.props.launcherSettings,
          this.state.forcedRestartLauncherSettings,
        ));

    const contents = (
      <Layout.Container gap>
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
            resetValue={getFlipperServerConfig().settings.androidHome}
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
              content={
                'iOS development has limited functionality on non-MacOS devices'
              }
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
              isRegularFile
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
          releaseChannel={this.state.updatedLauncherSettings.releaseChannel}
          onReleaseChannelChange={(v) => {
            this.setState({
              updatedLauncherSettings: {
                ...this.state.updatedLauncherSettings,
                releaseChannel: v,
              },
              forcedRestartLauncherSettings: {
                ...this.state.forcedRestartLauncherSettings,
                releaseChannel: v,
              },
            });
          }}
        />
        <ToggledSection
          label="Suppress error notifications send from client plugins"
          toggled={suppressPluginErrors}
          onChange={(enabled) => {
            this.setState((prevState) => ({
              updatedSettings: {
                ...prevState.updatedSettings,
                suppressPluginErrors: enabled,
              },
            }));
          }}
        />
        <ToggledSection
          label="Persist data in plugins after device disconnects"
          toggled={persistDeviceData}
          onChange={(enabled) => {
            this.setState((prevState) => ({
              updatedSettings: {
                ...prevState.updatedSettings,
                persistDeviceData: enabled,
              },
            }));
          }}
        />
        <Layout.Container style={{paddingLeft: 15, paddingBottom: 10}}>
          Theme Selection
          <Radio.Group
            value={darkMode}
            onChange={(event) => {
              this.setState((prevState) => ({
                updatedSettings: {
                  ...prevState.updatedSettings,
                  darkMode: event.target.value,
                },
              }));
              loadTheme(event.target.value);
            }}>
            <Radio.Button value="dark">Dark</Radio.Button>
            <Radio.Button value="light">Light</Radio.Button>
            <Radio.Button value="system">Use System Setting</Radio.Button>
          </Radio.Group>
        </Layout.Container>
        <NUX
          // TODO: provide link to Flipper doc with more details
          title="Plugin marketplace serve as a way to distribute private/internal plugins"
          placement="right">
          <ToggledSection
            label="Enable plugin marketplace"
            toggled={enablePluginMarketplace}
            frozen={false}
            onChange={(v) => {
              this.setState({
                updatedSettings: {
                  ...this.state.updatedSettings,
                  enablePluginMarketplace: v,
                },
              });
            }}>
            <URLConfigField
              label="Marketplace URL"
              defaultValue={
                marketplaceURL || 'http://plugin-marketplace.local/get-plugins'
              }
              onChange={(v) => {
                this.setState({
                  updatedSettings: {
                    ...this.state.updatedSettings,
                    marketplaceURL: v,
                  },
                });
              }}
            />
            <ToggledSection
              label="Enable auto update"
              toggled={enablePluginMarketplaceAutoUpdate}
              frozen={false}
              onChange={(v) => {
                this.setState({
                  updatedSettings: {
                    ...this.state.updatedSettings,
                    enablePluginMarketplaceAutoUpdate: v,
                  },
                });
              }}
            />
          </ToggledSection>
        </NUX>
        <Layout.Right center>
          <span>Reset all new user tooltips</span>
          <ResetTooltips />
        </Layout.Right>
        <Layout.Right center>
          <span>Reset all local storage based state</span>
          <ResetLocalState />
        </Layout.Right>
      </Layout.Container>
    );

    const footer = (
      <>
        <Button onClick={this.props.onHide}>Cancel</Button>
        <Button
          disabled={settingsPristine || forcedRestart}
          onClick={this.applyChangesWithoutRestart}>
          Apply
        </Button>
        <Button
          disabled={settingsPristine}
          type="primary"
          onClick={this.applyChanges}>
          Apply and{' '}
          {this.props.platform === 'darwin' ? 'Restart' : 'Quit Flipper'}
        </Button>
      </>
    );

    return this.props.noModal ? (
      <>
        {contents}
        {footer}
      </>
    ) : (
      this.renderSandyContainer(contents, footer)
    );
  }
}

export default connect<StateFromProps, DispatchFromProps, OwnProps, Store>(
  ({settingsState, launcherSettingsState}) => ({
    settings: settingsState,
    launcherSettings: launcherSettingsState,
  }),
  {updateSettings, updateLauncherSettings},
)(withTrackingScope(SettingsSheet));

function ResetTooltips() {
  const nuxManager = useContext(_NuxManagerContext);

  return (
    <Button
      onClick={() => {
        nuxManager.resetHints();
      }}>
      Reset hints
    </Button>
  );
}

function ResetLocalState() {
  return (
    <Button
      danger
      onClick={() => {
        window.localStorage.clear();
        message.success('Local storage state cleared');
      }}>
      Reset all state
    </Button>
  );
}
