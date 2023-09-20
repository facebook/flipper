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

type PowerSearchFloatTermProps = {
  onCancel: () => void;
  onChange: (value: number) => void;
  defaultValue?: number;
};

export const PowerSearchFloatTerm: React.FC<PowerSearchFloatTermProps> = ({
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
        onBlur={(event) => {
          const newValue = event.target.value;

          setEditing(false);

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
        defaultValue={defaultValue}
      />
    );
  }

  return <Button onClick={() => setEditing(true)}>{defaultValue}</Button>;
};
