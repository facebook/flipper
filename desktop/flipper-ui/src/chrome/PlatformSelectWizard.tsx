/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {Component} from 'react';
import {updateSettings, Action} from '../reducers/settings';
import {connect} from 'react-redux';
import {State as Store} from '../reducers';
import {flush} from '../utils/persistor';
import ToggledSection from './settings/ToggledSection';
import {isEqual} from 'lodash';
import {Platform, reportUsage, Settings} from 'flipper-common';
import {Modal, Button} from 'antd';
import {Layout, withTrackingScope, _NuxManagerContext} from 'flipper-plugin';
import {getRenderHostInstance} from '../RenderHost';

const WIZARD_FINISHED_LOCAL_STORAGE_KEY = 'platformSelectWizardFinished';

type OwnProps = {
  onHide: () => void;
  platform: Platform;
};

type StateFromProps = {
  settings: Settings;
};

type DispatchFromProps = {
  updateSettings: (settings: Settings) => Action;
};

type State = {
  updatedSettings: Settings;
  forcedRestartSettings: Partial<Settings>;
};

type Props = OwnProps & StateFromProps & DispatchFromProps;
class PlatformSelectWizard extends Component<Props, State> {
  state: State = {
    updatedSettings: {...this.props.settings},
    forcedRestartSettings: {},
  };

  componentDidMount() {
    reportUsage('platformwizard:opened');
  }

  componentWillUnmount() {
    reportUsage('platformwizard:closed');
  }

  applyChanges = async (settingsPristine: boolean) => {
    this.props.updateSettings(this.state.updatedSettings);

    markWizardAsCompleted();

    this.props.onHide();

    return flush().then(() => {
      if (!settingsPristine) {
        reportUsage('platformwizard:action:changed');
        getRenderHostInstance().restartFlipper();
      } else {
        reportUsage('platformwizard:action:noop');
      }
    });
  };

  render() {
    const {enableAndroid, enableIOS} = this.state.updatedSettings;

    const settingsPristine = isEqual(
      this.props.settings,
      this.state.updatedSettings,
    );

    const contents = (
      <Layout.Container gap>
        <Layout.Container style={{width: '100%', paddingBottom: 15}}>
          <>
            Please select the targets you intend to debug, so that we can
            optimise the configuration for the selected targets.
          </>
        </Layout.Container>
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
          }}></ToggledSection>
        <ToggledSection
          label="iOS Developer"
          toggled={enableIOS && this.props.platform === 'darwin'}
          onChange={(v) => {
            this.setState({
              updatedSettings: {...this.state.updatedSettings, enableIOS: v},
            });
          }}></ToggledSection>
      </Layout.Container>
    );

    const footerText = settingsPristine ? 'Looks fine' : 'Apply and Restart';
    const footer = (
      <>
        <Button
          type="primary"
          onClick={() => this.applyChanges(settingsPristine)}>
          {footerText}
        </Button>
      </>
    );

    return (
      <Modal
        open
        centered
        onCancel={() => {
          this.props.onHide();
          markWizardAsCompleted();
        }}
        width={570}
        title="Select Platform Configuration"
        footer={footer}>
        {contents}
      </Modal>
    );
  }
}

export default connect<StateFromProps, DispatchFromProps, OwnProps, Store>(
  ({settingsState}) => ({
    settings: settingsState,
  }),
  {updateSettings},
)(withTrackingScope(PlatformSelectWizard));

export function hasPlatformWizardBeenDone(
  localStorage: Storage | undefined,
): boolean {
  return (
    !localStorage ||
    localStorage.getItem(WIZARD_FINISHED_LOCAL_STORAGE_KEY) !== 'true'
  );
}

function markWizardAsCompleted() {
  window.localStorage.setItem(WIZARD_FINISHED_LOCAL_STORAGE_KEY, 'true');
}
