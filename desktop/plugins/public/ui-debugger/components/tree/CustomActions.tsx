/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {
  ActionIcon,
  CustomAction,
  CustomActionGroup,
} from '../../../ui-debugger/ClientTypes';
import {Button, Dropdown, Typography} from 'antd';
// eslint-disable-next-line rulesdir/no-restricted-imports-clone
import {Glyph} from 'flipper';
import {
  MultiSelectableDropDownItem,
  StyledMultiSelectDropDownItem,
} from '../shared/MultiSelectableDropDownItem';
import {CustomDropDown} from '../shared/CustomDropDown';
import {styled, theme, usePlugin} from 'flipper-plugin';
import {plugin} from '../../../ui-debugger';

function getIcon(icon: ActionIcon) {
  switch (icon.type) {
    case 'Local':
      return (
        <img
          src={icon.iconPath}
          style={{height: 16, width: 16, marginTop: -2}}
        />
      );
    case 'Fb':
      return <Glyph name={icon.iconName} size={16} />;
    case 'Antd':
      throw new Error('Antd Icon Not implemented');
  }
}

function DropDownItems({
  customActions,
  groupIdx,
}: {
  groupIdx: number;
  customActions: CustomAction[];
}) {
  const instance = usePlugin(plugin);

  const selecteditems = customActions
    .filter((items) => items.type === 'BooleanAction' && items.value === true)
    .map((item) => item.title);

  return (
    <>
      {customActions.map((action, actionIdx) => {
        switch (action.type) {
          case 'BooleanAction':
            return (
              <MultiSelectableDropDownItem
                onSelect={(_, selected) => {
                  instance.onCustomAction(groupIdx, actionIdx, selected);
                }}
                text={action.title}
                value={action.title}
                key={action.title}
                selectedValues={new Set(selecteditems)}
              />
            );
          case 'UnitAction':
            return (
              <ClickableDropdownItem
                gap="small"
                center
                onClick={() =>
                  instance.onCustomAction(groupIdx, actionIdx, undefined)
                }>
                <Glyph
                  name="send"
                  variant="outline"
                  size={16}
                  color={theme.primaryColor}
                />
                <Typography.Text>{action.title}</Typography.Text>
              </ClickableDropdownItem>
            );
        }
      })}
    </>
  );
}

const ClickableDropdownItem = styled(StyledMultiSelectDropDownItem)({
  ':active': {
    opacity: 0.7,
  },
});

export function CustomActionGroupDropDown({
  customActionGroup,
  groupIdx,
}: {
  customActionGroup: CustomActionGroup;
  groupIdx: number;
}) {
  return (
    <Dropdown
      dropdownRender={() => {
        return (
          <CustomDropDown>
            <Typography.Text
              style={{
                userSelect: 'none',
                color: theme.textColorSecondary,
                padding: theme.space.small,
              }}>
              {customActionGroup.title}
            </Typography.Text>
            <DropDownItems
              customActions={customActionGroup.actions}
              groupIdx={groupIdx}
            />
          </CustomDropDown>
        );
      }}>
      <Button
        type="default"
        shape="circle"
        icon={getIcon(customActionGroup.actionIcon)}></Button>
    </Dropdown>
  );
}
