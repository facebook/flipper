/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {cloneElement} from 'react';
import {styled, FlexColumn} from 'flipper';
import {Button, Divider, Badge, Tooltip} from 'antd';
import {
  MobileFilled,
  AppstoreOutlined,
  BellOutlined,
  FileExclamationOutlined,
  LoginOutlined,
  BugOutlined,
  SettingOutlined,
  QuestionCircleOutlined,
  MedicineBoxOutlined,
} from '@ant-design/icons';
import {SidebarLeft, SidebarRight} from './SandyIcons';

const LeftRailContainer = styled(FlexColumn)({
  width: 48,
  boxShadow: 'inset -1px 0px 0px rgba(0, 0, 0, 0.1)',
  justifyContent: 'space-between',
});
LeftRailContainer.displayName = 'LeftRailContainer';

const LeftRailSection = styled(FlexColumn)({
  padding: '8px 0px',
  alignItems: 'center',
});
LeftRailSection.displayName = 'LeftRailSection';

const LeftRailButtonElem = styled(Button)<{small?: boolean}>(({small}) => ({
  width: 36,
  height: 36,
  margin: small ? 2 : 6,
  padding: '5px 0',
  border: 'none',
}));
LeftRailButtonElem.displayName = 'LeftRailButtonElem';

function LeftRailButton({
  icon,
  small,
  active,
  count,
  title,
}: {
  icon?: React.ReactElement;
  small?: boolean;
  active?: boolean;
  count?: number;
  title: string;
}) {
  let iconElement =
    icon && cloneElement(icon, {style: {fontSize: small ? 16 : 24}});
  if (count !== undefined) {
    iconElement = <Badge count={count}>{iconElement}</Badge>;
  }
  return (
    <Tooltip title={title} placement="right">
      <LeftRailButtonElem
        small={small}
        type={active ? 'primary' : 'ghost'}
        icon={iconElement}
      />
    </Tooltip>
  );
}

const LeftRailDivider = styled(Divider)({
  margin: 10,
  width: 36,
  minWidth: 36,
});
LeftRailDivider.displayName = 'LeftRailDividier';

export function LeftRail() {
  return (
    <LeftRailContainer>
      <LeftRailSection>
        <LeftRailButton icon={<MobileFilled />} active title="App Inspect" />
        <LeftRailButton icon={<AppstoreOutlined />} title="Plugin Manager" />
        <LeftRailButton
          count={8}
          icon={<BellOutlined />}
          title="Notifications"
        />
        <LeftRailDivider />
        <LeftRailButton
          icon={<FileExclamationOutlined />}
          title="Flipper Logs"
        />
      </LeftRailSection>
      <LeftRailSection>
        <LeftRailButton
          icon={<MedicineBoxOutlined />}
          small
          title="Setup Doctor"
        />
        <LeftRailButton
          icon={<QuestionCircleOutlined />}
          small
          title="Help / Start Screen"
        />
        <LeftRailButton icon={<SettingOutlined />} small title="Settings" />
        <LeftRailButton
          icon={<BugOutlined />}
          small
          title="Feedback / Bug Reporter"
        />
        <LeftRailButton
          icon={<SidebarLeft />}
          small
          title="Right Sidebar Toggle"
        />
        <LeftRailButton
          icon={<SidebarRight />}
          small
          title="Left Sidebar Toggle"
        />
        <LeftRailButton icon={<LoginOutlined />} title="Log In" />
      </LeftRailSection>
    </LeftRailContainer>
  );
}
