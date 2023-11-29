/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {cx} from '@emotion/css';
import {Input} from 'antd';
import {inputBase, readOnlyInput} from './shared';
import React from 'react';

export function StyledTextArea({
  value,
  color,
  mutable,
}: {
  value: any;
  color: string;
  mutable: boolean;
  rightAddon?: string;
}) {
  return (
    <Input.TextArea
      autoSize
      className={cx(inputBase, !mutable && readOnlyInput)}
      bordered
      style={{color: color}}
      readOnly={!mutable}
      value={value}
    />
  );
}
