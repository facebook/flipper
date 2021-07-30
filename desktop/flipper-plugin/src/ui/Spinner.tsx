/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {LoadingOutlined} from '@ant-design/icons';
import {Spin} from 'antd';
import React from 'react';

export function Spinner({size}: {size?: number}) {
  return (
    <Spin indicator={<LoadingOutlined style={{fontSize: size ?? 24}} spin />} />
  );
}
