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
import {Button, Typography} from 'antd';
import {
  getFlipperLib,
  Layout,
  withTrackingScope,
  _NuxManagerContext,
} from 'flipper-plugin';
import {getFlipperServer, getFlipperServerConfig} from '../flipperServer';
import {useStore} from '../utils/useStore';

const WIZARD_FINISHED_LOCAL_STORAGE_KEY = 'platformSelectWizardFinished';

type Props = {
  onSettingsChange: (settingsChanged: boolean) => void;
};

export const PlatformSelectWizard = withTrackingScope(
  function PlatformSelectWizard({onSettingsChange}: Props) {
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
            if (
              getFlipperLib().environmentInfo.os.platform === 'darwin' &&
              getFlipperLib().isFB
            ) {
              getFlipperServer().exec('restart');
            } else {
              getFlipperServer().exec('shutdown');
            }
            window.close();
          } else {
            reportUsage('platformwizard:action:noop');
          }
        });
      },
      [store, updatedSettings],
    );

    const {enableAndroid, enableIOS} = updatedSettings;

    const settingsPristine = isEqual(settings, updatedSettings);

    useEffect(() => {
      onSettingsChange(!settingsPristine);
    }, [onSettingsChange, settingsPristine]);

    return (
      <Layout.Container gap>
        <Typography.Paragraph>
          Please select the targets you intend to debug, so that we can optimise
          the configuration for the selected targets. You can change it later in
          the settings.
        </Typography.Paragraph>
        <ToggledSection
          label="Android Developer"
          toggled={enableAndroid}
          onChange={(v) => {
            setUpdateSettings({
              ...updatedSettings,
              enableAndroid: v,
            });
          }}
        />
        <ToggledSection
          label="iOS Developer"
          toggled={enableIOS && platform === 'darwin'}
          onChange={(v) => {
            setUpdateSettings({
              ...updatedSettings,
              enableIOS: v,
            });
          }}
        />
        <hr />
        <Button
          type="primary"
          onClick={() => applyChanges(settingsPristine)}
          disabled={settingsPristine}
          title={settingsPristine ? 'No changes made' : ''}>
          Save changes and {platform === 'darwin' ? 'restart' : 'kill'} Flipper
        </Button>
      </Layout.Container>
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
