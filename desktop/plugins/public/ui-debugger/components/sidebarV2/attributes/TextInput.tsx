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
import {inputBase, opactity as pendingStyle, readOnlyInput} from './shared';
import React from 'react';
import {useOptimisticValue} from './useOptimisticValue';

export function StyledTextArea({
  value,
  color,
  mutable,
  onChange,
  style,
}: {
  style?: React.CSSProperties;
  value: string | null;
  color: string;
  mutable: boolean;
  onChange: (value: string | null) => void;
  rightAddon?: string;
}) {
  const optimisticValue = useOptimisticValue(value, onChange);

  return (
    <Input.TextArea
      autoSize
      className={cx(inputBase, !mutable && readOnlyInput)}
      bordered
      style={{color, ...pendingStyle(optimisticValue), ...style}}
      readOnly={!mutable}
      value={optimisticValue.value ?? undefined}
      onChange={(event) => optimisticValue.onChange(event.target.value)}
    />
  );
}
