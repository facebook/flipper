/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {css} from '@emotion/css';
import {Button, message, Modal, notification, Typography} from 'antd';
import React from 'react';
import {Layout} from './ui';
import {Dialog, getFlipperLib, path} from 'flipper-plugin';
import {getFlipperServer} from './flipperServer';
import {getLogger} from 'flipper-common';

type ConnectionUpdate = {
  key: string;
  type: 'loading' | 'info' | 'success' | 'success-info' | 'error' | 'warning';
  os: string;
  app: string;
  device: string;
  title: string;
  detail?: string;
};

type ErrorUpdate = {
  entries: Set<string>;
  orderedEntries: Array<string>;
};

const errorUpdates = new Map<string, ErrorUpdate>();

const className = css`
  .ant-message-notice-content {
    width: 30%;
  }
`;

export const connectionUpdate = (
  update: ConnectionUpdate,
  onClick: () => void,
) => {
  const title = `${update.app} on ${update.device} ${update.title}`;

  if (update.type === 'error') {
    const errors = errorUpdates.get(update.key) ?? {
      entries: new Set(),
      orderedEntries: [],
    };

    if (update.detail && !errors.entries.has(update.detail)) {
      errors.entries.add(update.detail);
      errors.orderedEntries.push(update.detail);
    }

    errorUpdates.set(update.key, errors);
    notification.error({
      key: update.key,
      message: title,
      description: (
        <Layout.Bottom>
          <div>
            {errors.orderedEntries.map((e, idx) => {
              return (
                <div key={idx} style={{marginBottom: 10}}>
                  <Typography.Text>{e}</Typography.Text>
                </div>
              );
            })}
          </div>
          <div>
            <Button
              type="primary"
              style={{float: 'right'}}
              onClick={() => {
                notification.close(update.key);

                onClick();
              }}>
              Troubleshoot
            </Button>
          </div>
        </Layout.Bottom>
      ),
      duration: 0,
      onClose: () => message.destroy(update.key),
    });
  } else {
    if (update.type === 'success' || update.type === 'success-info') {
      errorUpdates.delete(update.key);
    }

    let content = title;
    if (update.detail) {
      content += `\n ${update.detail}`;
    }
    let duration = 0;
    if (update.type === 'success' || update.type === 'success-info') {
      duration = 3;
    } else if (update.type === 'loading') {
      // seconds until show how to debug hanging connection
      duration = 30;
    }
    message.open({
      key: update.key,
      type: update.type === 'success-info' ? 'info' : update.type,
      content,
      className,
      duration,
      onClick:
        update.type !== 'loading'
          ? () => {
              message.destroy(update.key);
            }
          : undefined,
      // NOTE: `onClose` is only called when the message is closed by antd because of `duration`
      // It is not closed when we call `message.destroy(key)`.
      // Thus we can use it trigger a timeout modal for hanging "attempting to connect" messages
      onClose: () => {
        if (update.type === 'loading') {
          Dialog.showModal((hide) => (
            <DIYConnectivityFixModal
              onHide={hide}
              app={update.app}
              os={update.os}
            />
          ));
        }
      },
    });
  }
};

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

function DIYConnectivityFixModal({
  app,
  os,
  onHide,
}: {
  app: string;
  os: string;
  onHide: () => void;
}) {
  return (
    <Modal onCancel={onHide} open footer={null}>
      <div>
        <Typography.Title style={styles.title}>
          Connecting to {app} has timed out.
        </Typography.Title>
        <DIYConnectivityFix os={os} mode="app-connectivity" />
      </div>
    </Modal>
  );
}

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
