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
  type: 'loading' | 'info' | 'success' | 'error' | 'warning';
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

    const content = errors.orderedEntries.reduce((accumulator, e) => {
      return accumulator.length > 0 ? accumulator + '\n' + e : e;
    });

    errorUpdates.set(update.key, errors);
    notification.error({
      key: update.key,
      message: title,
      description: (
        <Layout.Bottom>
          <Typography.Text>{content}</Typography.Text>
          <div style={{marginTop: 10}}>
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
    if (update.type === 'success') {
      errorUpdates.delete(update.key);
    }

    let content = title;
    if (update.detail) {
      content += `\n ${update.detail}`;
    }
    message.open({
      key: update.key,
      type: update.type,
      content,
      className,
      style: {
        marginTop: '68px',
      },
      duration: update.type === 'success' ? 3 : 0,
      onClick: () => message.destroy(update.key),
    });
  }
};
