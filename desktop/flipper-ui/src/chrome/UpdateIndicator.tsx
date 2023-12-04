/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Button, notification, Typography} from 'antd';
import isProduction from '../utils/isProduction';
import {reportPlatformFailures, ReleaseChannel} from 'flipper-common';
import React, {useEffect, useState} from 'react';
import fbConfig from '../fb-stubs/config';
import {useStore} from '../utils/useStore';
import {getAppVersion} from '../utils/info';
import {checkForUpdate} from '../fb-stubs/checkForUpdate';
import {NotificationBody} from '../ui/components/NotificationBody';
import {getFlipperServer, getFlipperServerConfig} from '../flipperServer';

export type VersionCheckResult =
  | {
      kind: 'update-available';
      url: string;
      version: string;
    }
  | {
      kind: 'up-to-date';
    }
  | {
      kind: 'error';
      msg: string;
    };

export default function UpdateIndicator() {
  const [versionCheckResult, setVersionCheckResult] =
    useState<VersionCheckResult>({kind: 'up-to-date'});
  const launcherMsg = useStore((state) => state.application.launcherMsg);

  // Effect to show notification if details change
  useEffect(() => {
    switch (versionCheckResult.kind) {
      case 'up-to-date':
        break;
      case 'update-available':
        console.log(
          `Flipper update available: ${versionCheckResult.version} at ${versionCheckResult.url}`,
        );
        notification.info({
          placement: 'bottomLeft',
          key: 'flipperupdatecheck',
          message: 'Update available',
          description: getUpdateAvailableMessage(versionCheckResult),
          duration: null, // no auto close
        });
        break;
      case 'error':
        console.warn(
          `Failed to check for Flipper update: ${versionCheckResult.msg}`,
        );
        break;
    }
  }, [versionCheckResult]);

  // trigger the update check, unless there is a launcher message already
  useEffect(() => {
    const version = getAppVersion();
    const config = getFlipperServerConfig().processConfig;
    if (launcherMsg && launcherMsg.message) {
      if (launcherMsg.severity === 'error') {
        notification.error({
          placement: 'bottomLeft',
          key: 'launchermsg',
          message: 'Launch problem',
          description: <NotificationBody text={launcherMsg.message} />,
          duration: null,
        });
      } else {
        notification.warning({
          placement: 'bottomLeft',
          key: 'launchermsg',
          message: 'Flipper version warning',
          description: <NotificationBody text={launcherMsg.message} />,
          duration: null,
        });
      }
    } else if (
      version &&
      config.updaterEnabled &&
      !config.suppressPluginUpdateNotifications &&
      isProduction()
    ) {
      reportPlatformFailures(
        checkForUpdate(version)
          .then((res) => {
            if (res.kind === 'error') {
              throw new Error(res.msg);
            }
            if (res.kind === 'up-to-date') {
              setVersionCheckResult(res);
              return;
            }

            return getFlipperServer()
              .exec('fetch-new-version', res.version)
              .then(() => {
                setVersionCheckResult(res);
              });
          })
          .catch((e) => {
            console.warn('Version check failure: ', e);
            setVersionCheckResult({
              kind: 'error',
              msg: e,
            });
          }),
        'publicVersionCheck',
      );
    }
  }, [launcherMsg]);

  return null;
}

export function getUpdateAvailableMessage(versionCheckResult: {
  url: string;
  version: string;
}): React.ReactNode {
  const {launcherSettings} = getFlipperServerConfig();

  const shutdownFlipper = () => {
    getFlipperServer().exec('shutdown');
    window.close();
  };

  return (
    <>
      Flipper version {versionCheckResult.version} is now available.
      {fbConfig.isFBBuild ? (
        fbConfig.getReleaseChannel() === ReleaseChannel.INSIDERS ||
        launcherSettings.ignoreLocalPin ? (
          <Button block type="primary" onClick={shutdownFlipper}>
            Quit Flipper to upgrade
          </Button>
        ) : (
          <>
            {' '}
            Run <code>arc pull</code> (optionally with <code>--latest</code>) in{' '}
            <code>~/fbsource</code> and{' '}
            <Button block type="primary" onClick={shutdownFlipper}>
              Quit Flipper to upgrade
            </Button>
            .
          </>
        )
      ) : (
        <>
          {' '}
          Click to{' '}
          <Typography.Link href={versionCheckResult.url}>
            download
          </Typography.Link>
          .
        </>
      )}
    </>
  );
}
