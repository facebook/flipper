/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Button, DatePicker, DatePickerProps} from 'antd';
import dayjs from 'dayjs';
import React from 'react';
// Use this exact version of moment to match what antd has
// eslint-disable-next-line no-restricted-imports
import moment from 'antd/node_modules/moment';

type PowerSearchAbsoluteTermProps = {
  onCancel: () => void;
  onChange: (value: Date) => void;
  dateOnly?: boolean;
  minValue?: Date;
  maxValue?: Date;
  defaultValue?: Date;
};

export const DATE_ONLY_FORMAT = 'YYYY-MM-DD';
export const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

export const PowerSearchAbsoluteDateTerm: React.FC<
  PowerSearchAbsoluteTermProps
> = ({onCancel, onChange, dateOnly, minValue, maxValue, defaultValue}) => {
  const [editing, setEditing] = React.useState(!defaultValue);

  const disabledDate: DatePickerProps['disabledDate'] = React.useCallback(
    (date) => {
      if (minValue !== undefined && date < minValue) {
        return true;
      }
      if (maxValue !== undefined && date > maxValue) {
        return true;
      }
      return false;
    },
    [minValue, maxValue],
  );

  const format = dateOnly ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm:ss';

  const valueRef = React.useRef<Date>();
  if (defaultValue && !valueRef.current) {
    valueRef.current = defaultValue;
  }

  if (editing) {
    return (
      <DatePicker
        autoFocus
        style={{width: 100}}
        placeholder="..."
        format={format}
        onChange={(newValue) => {
          if (!newValue) {
            onCancel();
            return;
          }

          const newDate = newValue.toDate();
          valueRef.current = newDate;
          onChange(newDate);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            onCancel();
          }
        }}
        onBlur={() => {
          if (!valueRef.current) {
            onCancel();
          }
          setEditing(false);
        }}
        disabledDate={disabledDate}
        showTime={!dateOnly}
        defaultOpen
        defaultValue={defaultValue ? moment(defaultValue) : undefined}
      />
    );
  }

  return (
    <Button onClick={() => setEditing(true)}>
      {dateOnly
        ? dayjs(defaultValue).format(DATE_ONLY_FORMAT)
        : dayjs(defaultValue).format(DATE_TIME_FORMAT)}
    </Button>
  );
};
