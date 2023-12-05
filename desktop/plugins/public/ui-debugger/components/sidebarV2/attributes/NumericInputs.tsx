/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {InputNumber} from 'antd';

import {theme, Layout} from 'flipper-plugin';
import React from 'react';
import {CompoundTypeHint} from '../../../ClientTypes';
import {css, cx} from '@emotion/css';
import {numberColor, opactity, readOnlyInput} from './shared';
import {useOptimisticValue} from './useOptimisticValue';

type FourItemArray<T = any> = [T, T, T, T];

export function TwoByTwoNumberGroup({
  values,
}: {
  values: FourItemArray<NumberGroupValue>;
}) {
  return (
    <Layout.Container gap="small" style={{flex: '0 1 auto'}}>
      <NumberGroup values={[values[0], values[1]]} />
      <NumberGroup values={[values[2], values[3]]} />
    </Layout.Container>
  );
}

export type NumberGroupValue = {
  value: number;
  addonText: string;
  min?: number;
  max?: number;
  mutable: boolean;
  hint: CompoundTypeHint;
  onChange: (value: number, hint: CompoundTypeHint) => void;
};

export function NumberGroup({values}: {values: NumberGroupValue[]}) {
  return (
    <Layout.Horizontal gap="small">
      {values.map(
        ({value, addonText, mutable, onChange, hint, min, max}, idx) => (
          <StyledInputNumber
            key={idx}
            color={numberColor}
            mutable={mutable}
            maxValue={max}
            minValue={min}
            value={value}
            onChange={(value) => onChange(value, hint)}
            rightAddon={addonText}
          />
        ),
      )}
    </Layout.Horizontal>
  );
}

export function StyledInputNumber({
  value,
  color,
  rightAddon,
  mutable,
  onChange,
  minValue,
  maxValue,
}: {
  minValue?: number;
  maxValue?: number;
  value: any;
  mutable: boolean;
  color: string;
  rightAddon?: string;
  onChange: (value: number) => void;
}) {
  let formatted: any = value;
  if (typeof value === 'number') {
    //cap the number of decimal places to 5 but dont add trailing zeros
    formatted = Number.parseFloat(value.toFixed(5));
  }

  const optimisticValue = useOptimisticValue<number>(formatted, onChange);

  let step: number = 1;
  if (minValue != null && maxValue != null) {
    if (Math.abs(minValue - maxValue) <= 1) {
      step = 0.1;
    }
  }

  return (
    <InputNumber
      size="small"
      onChange={(value) =>
        value == null
          ? optimisticValue.onChange(0)
          : optimisticValue.onChange(value)
      }
      className={cx(
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
          //style the add on to look like a suffix
          .ant-input-number-group-addon {
            padding-right: 4px;
            padding-left: 2px;
            border-left: none;
            border-color: ${theme.disabledColor};
            background-color: none;
          }
          ${rightAddon != null && 'border-right: none;'}
          padding-top: 1px;
          padding-bottom: 1px;
          width: 100%;
        `,
      )}
      min={minValue}
      max={maxValue}
      step={step}
      bordered
      style={opactity(optimisticValue)}
      readOnly={!mutable}
      value={optimisticValue.value}
      addonAfter={
        rightAddon && (
          <span style={{color: theme.textColorSecondary}}>{rightAddon}</span>
        )
      }
    />
  );
}
