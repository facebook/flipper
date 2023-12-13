/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useState, useEffect, useCallback} from 'react';
import {updateSettings} from '../reducers/settings';
import {flush} from '../utils/persistor';
import ToggledSection from './settings/ToggledSection';
import {isEqual} from 'lodash';
import {reportUsage, Settings} from 'flipper-common';
import {Button} from 'antd';
import {Layout, withTrackingScope, _NuxManagerContext} from 'flipper-plugin';
import {getFlipperServer, getFlipperServerConfig} from '../flipperServer';
import {useStore} from '../utils/useStore';

const WIZARD_FINISHED_LOCAL_STORAGE_KEY = 'platformSelectWizardFinished';

type Props = {};

export const PlatformSelectWizard = withTrackingScope(
  function PlatformSelectWizard(_props: Props) {
    const store = useStore();
    const platform = getFlipperServerConfig().environmentInfo.os.platform;
    const settings = useStore((state) => state.settingsState);
    const [updatedSettings, setUpdateSettings] = useState<Settings>({
      ...settings,
    });

    useEffect(() => {
      reportUsage('platformwizard:opened');
      return () => {
        reportUsage('platformwizard:closed');
      };
    }, []);

    const applyChanges = useCallback(
      async (settingsPristine: boolean) => {
        store.dispatch(updateSettings(updatedSettings));

        markWizardAsCompleted();

        return flush().then(() => {
          if (!settingsPristine) {
            reportUsage('platformwizard:action:changed');
            getFlipperServer().exec('shutdown');
          } else {
            reportUsage('platformwizard:action:noop');
          }
        });
      },
      [store, updatedSettings],
    );

    const {enableAndroid, enableIOS} = updatedSettings;

    const settingsPristine = isEqual(settings, updatedSettings);

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
            setUpdateSettings({
              ...updatedSettings,
              enableAndroid: v,
            });
          }}></ToggledSection>
        <ToggledSection
          label="iOS Developer"
          toggled={enableIOS && platform === 'darwin'}
          onChange={(v) => {
            setUpdateSettings({
              ...updatedSettings,
              enableIOS: v,
            });
          }}></ToggledSection>
      </Layout.Container>
    );

    const footerText = settingsPristine ? 'Looks fine' : 'Apply and Restart';
    const footer = (
      <>
        <Button type="primary" onClick={() => applyChanges(settingsPristine)}>
          {footerText}
        </Button>
      </>
    );

    return (
      <>
        {contents}
        {footer}
      </>
    );
  },
);

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
