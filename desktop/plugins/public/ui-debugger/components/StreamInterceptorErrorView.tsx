/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Button, Result} from 'antd';
import * as React from 'react';

export function StreamInterceptorErrorView({
  retryCallback,
  title,
  message,
}: {
  title: string;
  message: string;
  retryCallback?: () => void;
}): React.ReactElement {
  return (
    <Result
      status="error"
      title={title}
      subTitle={message}
      extra={
        retryCallback && (
          <Button onClick={retryCallback} type="primary">
            Retry
          </Button>
        )
      }
    />
  );
}
