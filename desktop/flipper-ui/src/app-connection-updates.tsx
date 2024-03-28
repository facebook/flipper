/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {css} from '@emotion/css';
import {Button, message, notification, Typography} from 'antd';
import React from 'react';
import {Layout} from './ui';

type ConnectionUpdate = {
  key: string;
  type: 'loading' | 'info' | 'success' | 'success-info' | 'error' | 'warning';
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
    message.open({
      key: update.app,
      type: update.type === 'success-info' ? 'info' : update.type,
      content,
      className,
      duration:
        update.type === 'success' || update.type === 'success-info' ? 3 : 0,
      onClick: () => message.destroy(update.key),
    });
  }
};
