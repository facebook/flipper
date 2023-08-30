/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Input} from 'antd';
import React from 'react';

type PowerSearchFloatTermProps = {
  onCancel: () => void;
  onChange: (value: number) => void;
};

export const PowerSearchFloatTerm: React.FC<PowerSearchFloatTermProps> = ({
  onCancel,
  onChange,
}) => {
  return (
    <Input
      autoFocus
      style={{width: 100}}
      placeholder="..."
      onBlur={(event) => {
        const newValue = event.target.value;

        if (!newValue) {
          onCancel();
          return;
        }

        const normalizedValue = parseFloat(newValue);
        onChange(normalizedValue);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === 'Escape') {
          event.currentTarget.blur();
        }
      }}
      type="number"
      step={0.1}
    />
  );
};
