/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Select} from 'antd';
import React from 'react';
import {EnumLabels} from './PowerSearchConfig';

type PowerSearchEnumSetTermProps = {
  onCancel: () => void;
  onChange: (value: string[]) => void;
  enumLabels: EnumLabels;
  defaultValue?: string[];
  allowFreeform?: boolean;
};

export const PowerSearchEnumSetTerm: React.FC<PowerSearchEnumSetTermProps> = ({
  onCancel,
  onChange,
  enumLabels,
  defaultValue,
  allowFreeform,
}) => {
  const options = React.useMemo(() => {
    return Object.entries(enumLabels).map(([key, label]) => ({
      label,
      value: key,
    }));
  }, [enumLabels]);

  const selectValueRef = React.useRef<string[]>();
  if (defaultValue && !selectValueRef.current) {
    selectValueRef.current = defaultValue;
  }

  return (
    <Select
      mode={allowFreeform ? 'tags' : 'multiple'}
      autoFocus={!defaultValue}
      style={{minWidth: 100}}
      placeholder="..."
      options={options}
      defaultOpen={!defaultValue}
      defaultValue={defaultValue}
      dropdownMatchSelectWidth={false}
      onBlur={() => {
        if (!selectValueRef.current?.length) {
          onCancel();
        }
      }}
      onChange={(value) => {
        if (!value.length) {
          onCancel();
          return;
        }
        selectValueRef.current = value;
        onChange(value);
      }}
      onClear={onCancel}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === 'Escape') {
          event.currentTarget.blur();
        }
      }}
    />
  );
};
