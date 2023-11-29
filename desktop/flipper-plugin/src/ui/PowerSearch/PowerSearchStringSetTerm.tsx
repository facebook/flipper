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

type PowerSearchStringSetTermProps = {
  onCancel: () => void;
  onChange: (value: string[]) => void;
  defaultValue?: string[];
};

export const PowerSearchStringSetTerm: React.FC<
  PowerSearchStringSetTermProps
> = ({onCancel, onChange, defaultValue}) => {
  const selectValueRef = React.useRef<string[]>();
  if (defaultValue && !selectValueRef.current) {
    selectValueRef.current = defaultValue;
  }

  return (
    <Select
      mode="tags"
      autoFocus={!defaultValue}
      style={{minWidth: 100}}
      placeholder="..."
      defaultValue={defaultValue}
      onBlur={() => {
        if (!selectValueRef.current?.length) {
          onCancel();
        }
      }}
      open={false}
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
