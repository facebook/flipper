/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Input, Select} from 'antd';
import React from 'react';
import {inputBase, opactity, readOnlyInput, rowHeight} from './shared';
import {css, cx} from '@emotion/css';
import {theme} from 'flipper-plugin';
import {useOptimisticValue} from './useOptimisticValue';

type AllowedTypes = string | boolean;

export function SelectInput({
  options,
  onChange,
  mutable,
  value,
  color,
}: {
  options: {value: AllowedTypes; label: string}[];
  onChange: (value: any) => void;
  mutable: boolean;
  value: AllowedTypes;
  color: string;
}) {
  const optimisticValue = useOptimisticValue(value, onChange);
  if (mutable) {
    return (
      <Select
        size="small"
        className={dropDownCss}
        onChange={optimisticValue.onChange}
        value={optimisticValue.value}
        options={options}
        style={{
          color,
          height: rowHeight,
          ...opactity(optimisticValue),
        }}
      />
    );
  } else {
    return (
      <ImmutableSelectInput
        value={options.find((item) => item.value === value)?.label}
        color={color}
        mutable={false}
      />
    );
  }
}

const dropDownCss = css`
  .ant-select-selector {
    height: ${rowHeight}px !important;b
  }
`;

function ImmutableSelectInput({
  value,
  color,
  mutable,
  rightAddon,
}: {
  value: any;
  color: string;
  mutable: boolean;
  rightAddon?: string;
}) {
  return (
    <Input
      size="small"
      className={cx(
        inputBase,
        !mutable && readOnlyInput,
        css`
          //set input colour when no suffix
          color: ${color};
          //set input colour when has suffix
          .ant-input.ant-input-sm[type='text'] {
            color: ${color};
          }
          //set colour of suffix
          .ant-input.ant-input-sm[type='text'] + .ant-input-suffix {
            color: ${theme.textColorSecondary};
            opacity: 0.7;
          }
        `,
      )}
      bordered
      readOnly={!mutable}
      value={value}
      suffix={rightAddon}
    />
  );
}
