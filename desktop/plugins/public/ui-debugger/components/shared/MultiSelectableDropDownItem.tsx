/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Checkbox, Typography} from 'antd';
import {Layout, styled, theme} from 'flipper-plugin';

export function MultiSelectableDropDownItem<T>({
  value,
  selectedValues,
  onSelect,
  text,
}: {
  value: T;
  selectedValues: Set<T>;
  onSelect: (value: T, selected: boolean) => void;
  text: string;
}) {
  const isSelected = selectedValues.has(value);
  return (
    <StyledMultiSelectDropDownItem
      center
      padv="small"
      gap="small"
      onClick={(e) => {
        e.stopPropagation();
        onSelect(value, !isSelected);
      }}>
      <Checkbox
        checked={isSelected}
        onChange={() => {
          onSelect(value, !isSelected);
        }}
      />
      <Typography.Text>{text}</Typography.Text>
    </StyledMultiSelectDropDownItem>
  );
}

export const StyledMultiSelectDropDownItem = styled(Layout.Horizontal)({
  ':hover': {
    backgroundColor: theme.backgroundWash,
  },
  height: 32,
});
