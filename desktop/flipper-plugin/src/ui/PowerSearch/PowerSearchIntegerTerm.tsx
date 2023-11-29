/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Button, Input} from 'antd';
import React from 'react';

type PowerSearchIntegerTermProps = {
  onCancel: () => void;
  onChange: (value: number) => void;
  defaultValue?: number;
};

export const PowerSearchIntegerTerm: React.FC<PowerSearchIntegerTermProps> = ({
  onCancel,
  onChange,
  defaultValue,
}) => {
  const [editing, setEditing] = React.useState(!defaultValue);

  if (editing) {
    return (
      <Input
        autoFocus
        style={{width: 100}}
        placeholder="..."
        onChange={(event) => {
          const newValue = event.target.value;

          const normalizedValue = parseInt(newValue, 10);

          if (normalizedValue.toString() !== newValue) {
            event.target.value = normalizedValue.toString();
          }
        }}
        onBlur={(event) => {
          const newValue = event.target.value;

          setEditing(false);

          if (!newValue) {
            onCancel();
            return;
          }

          const normalizedValue = parseInt(newValue, 10);
          onChange(normalizedValue);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === 'Escape') {
            event.currentTarget.blur();
          }
        }}
        type="number"
        step={1}
        defaultValue={defaultValue}
      />
    );
  }

  return <Button onClick={() => setEditing(true)}>{defaultValue}</Button>;
};
