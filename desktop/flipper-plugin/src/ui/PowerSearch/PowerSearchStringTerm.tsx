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

type PowerSearchStringTermProps = {
  onCancel: () => void;
  onChange: (value: string) => void;
  defaultValue?: string;
};

export const PowerSearchStringTerm: React.FC<PowerSearchStringTermProps> = ({
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

          onChange(newValue);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === 'Escape') {
            event.currentTarget.blur();
          }
        }}
        defaultValue={defaultValue}
      />
    );
  }

  return <Button onClick={() => setEditing(true)}>{defaultValue}</Button>;
};
