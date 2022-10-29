/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {notification, Typography} from 'antd';
import isProduction from '../utils/isProduction';
import {reportPlatformFailures, ReleaseChannel} from 'flipper-common';
import React, {useEffect, useState} from 'react';
import fbConfig from '../fb-stubs/config';
import {useStore} from '../utils/useStore';
import {getAppVersion} from '../utils/info';
import {checkForUpdate} from '../fb-stubs/checkForUpdate';
import {getRenderHostInstance} from 'flipper-frontend-core';

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
    const config = getRenderHostInstance().serverConfig.processConfig;
    if (launcherMsg && launcherMsg.message) {
      if (launcherMsg.severity === 'error') {
        notification.error({
          placement: 'bottomLeft',
          key: 'launchermsg',
          message: 'Launch problem',
          description: launcherMsg.message,
          duration: null,
        });
      } else {
        notification.warning({
          placement: 'bottomLeft',
          key: 'launchermsg',
          message: 'Flipper version warning',
          description: launcherMsg.message,
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
        checkForUpdate(version).then((res) => {
          if (res.kind === 'error') {
            console.warn('Version check failure: ', res);
            setVersionCheckResult({
              kind: 'error',
              msg: res.msg,
            });
          } else {
            setVersionCheckResult(res);
          }
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
  return (
    <>
      Flipper version {versionCheckResult.version} is now available.
      {fbConfig.isFBBuild ? (
        fbConfig.getReleaseChannel() === ReleaseChannel.INSIDERS ? (
          <> Restart Flipper to update to the latest version.</>
        ) : (
          <>
            {' '}
            Run <code>arc pull</code> (optionally with <code>--latest</code>) in{' '}
            <code>~/fbsource</code> and restart Flipper to update to the latest
            version.
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
