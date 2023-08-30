/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {DatePicker, DatePickerProps} from 'antd';
import React from 'react';

type PowerSearchAbsoluteTermProps = {
  onCancel: () => void;
  onChange: (value: Date) => void;
  dateOnly?: boolean;
  minValue?: Date;
  maxValue?: Date;
};

export const DATE_ONLY_FORMAT = 'YYYY-MM-DD';
export const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

export const PowerSearchAbsoluteDateTerm: React.FC<
  PowerSearchAbsoluteTermProps
> = ({onCancel, onChange, dateOnly, minValue, maxValue}) => {
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
      }}
      disabledDate={disabledDate}
      showTime={!dateOnly}
      defaultOpen
    />
  );
};
