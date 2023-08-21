/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Menu} from 'antd';
import {theme} from 'flipper-plugin';
import React from 'react';

export function SelectableDropDownItem<T>({
  value,
  selectedValue,
  onSelect,
  text,
}: {
  value: T;
  selectedValue: T;
  onSelect: (value: T) => void;
  text: string;
}) {
  return (
    <Menu.Item
      style={{
        color:
          value === selectedValue ? theme.primaryColor : theme.textColorActive,
      }}
      onClick={() => {
        onSelect(value);
      }}>
      {text}
    </Menu.Item>
  );
}
