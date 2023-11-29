/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Result} from 'antd';
import * as React from 'react';

export function StreamInterceptorErrorView({
  button,
  title,
  message,
}: {
  title: string;
  message: string;
  button: React.ReactNode;
}): React.ReactElement {
  return (
    <Result status="error" title={title} subTitle={message} extra={button} />
  );
}
