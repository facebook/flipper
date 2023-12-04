/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {CopyOutlined} from '@ant-design/icons';
import {Typography} from 'antd';
import {theme} from 'flipper-plugin';
import * as React from 'react';

type NotificationbodyProps = {
  text: string;
};

export const NotificationBody: React.FC<NotificationbodyProps> = ({text}) => {
  const messageLoggedRef = React.useRef(false);

  return (
    <Typography.Paragraph
      style={{color: 'inherit'}}
      ellipsis={{
        rows: 10,
        tooltip: 'Message is too long. Please, find the full text in logs.',
        onEllipsis: (ellipsis) => {
          if (messageLoggedRef.current) {
            return;
          }
          if (ellipsis) {
            console.warn(
              'Message is too long to fit in the notification box. Original text:',
              text,
            );
            messageLoggedRef.current = true;
          }
        },
      }}
      copyable={{
        onCopy: () => navigator.clipboard.writeText(text),
        icon: <CopyOutlined style={{color: theme.textColorSecondary}} />,
      }}>
      {text}
    </Typography.Paragraph>
  );
};
