/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Button, notification, Typography} from 'antd';
import {getLogger} from 'flipper-common';
import {getFlipperLib, path} from 'flipper-plugin';
import {getFlipperServer} from '../flipperServer';

const styles = {
  numberedList: {
    listStyle: 'auto',
    paddingLeft: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  } satisfies React.CSSProperties,
  title: {
    marginBottom: 8,
  } satisfies React.CSSProperties,
};

export function DIYConnectivityFix({
  os,
  mode,
}: {
  os: string;
  mode: 'cant-see-device' | 'app-connectivity';
}) {
  return (
    <div>
      <Typography.Paragraph>
        This is usually can be fixed in a few ways. Try the following in the
        order presented.
      </Typography.Paragraph>
      <Typography.Title level={3} style={styles.title}>
        Least involved
      </Typography.Title>
      <ol style={styles.numberedList}>
        {mode === 'app-connectivity' && (
          <li>
            <Typography.Text>
              Completly close the app on the device
            </Typography.Text>
          </li>
        )}
        <li>
          <Button
            type="primary"
            size="small"
            onClick={() => {
              const step = os === 'iOS' ? 'ios-idb-kill' : 'android-adb-kill';
              logTroubleshootGuideStep(step);
              getFlipperServer()
                .exec(step)
                .then(() => {
                  notification.info({
                    message: `Restarted ${os} connections`,
                  });
                })
                .catch((e) => {
                  notification.error({
                    message: `Failed to restart ${os} connections`,
                    description: e.message,
                  });
                });
            }}>
            Click to restart{' '}
            {os === 'iOS'
              ? 'IDB (iOS connections)'
              : 'ADB (Android connections)'}
          </Button>
        </li>
        {mode === 'app-connectivity' && (
          <li>
            <Typography.Text>Launch the app on the device</Typography.Text>
          </li>
        )}
      </ol>
      <Typography.Title level={3} style={styles.title}>
        More involved
      </Typography.Title>
      <ol style={styles.numberedList}>
        <li>
          <Typography.Text>Restart device / emulator</Typography.Text>
        </li>
        {mode === 'app-connectivity' && (
          <li>
            <Button
              type="primary"
              size="small"
              onClick={() => {
                getFlipperLib()
                  .remoteServerContext.fs.rm(
                    path.join(
                      getFlipperLib().paths.homePath,
                      '.flipper',
                      'certs',
                    ),
                  )
                  .then(() => {
                    logTroubleshootGuideStep('delete-certs');
                    notification.info({
                      message: `Certificates deleted`,
                      description: 'Please restart Flipper',
                      duration: 10000,
                    });
                  })
                  .catch((e) => {
                    notification.error({
                      message: `Failed to delete cerificates folder, ${e}`,
                    });
                  });
              }}>
              Click to clear Flipper certificates
            </Button>
          </li>
        )}

        <li>
          <Button
            type="primary"
            size="small"
            onClick={() => {
              logTroubleshootGuideStep('restart-flipper');
              getFlipperServer()
                .exec('restart')
                .then(() => {
                  notification.info({
                    message: `Restarting Flipper server`,
                  });
                })
                .catch((e) => {
                  notification.error({
                    message: `Failed to restart Flipper`,
                    description: e.message,
                  });
                });
            }}>
            Click to restart Flipper
          </Button>
        </li>
      </ol>
      <Typography.Title level={3} style={styles.title}>
        Most involved
      </Typography.Title>
      <Typography.Paragraph>
        Restarting your computer can frequently solve these sorts of issues.
      </Typography.Paragraph>
    </div>
  );
}

export function logTroubleshootGuideStep(step: string) {
  getLogger().track('usage', 'troubleshoot-guide-v2-step', {
    step,
  });
}
