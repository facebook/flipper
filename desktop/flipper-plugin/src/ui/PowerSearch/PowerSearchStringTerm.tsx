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

type PowerSearchStringTermProps = {
  onCancel: () => void;
  onChange: (value: string) => void;
};

export const PowerSearchStringTerm: React.FC<PowerSearchStringTermProps> = ({
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

        onChange(newValue);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === 'Escape') {
          event.currentTarget.blur();
        }
      }}
    />
  );
};
