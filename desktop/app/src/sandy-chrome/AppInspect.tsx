/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Button, Dropdown, Menu, Radio, Input} from 'antd';
import {shell} from 'electron';
import {LeftSidebar, SidebarTitle, InfoIcon} from './LeftSidebar';
import {
  AppleOutlined,
  AndroidOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import {Layout, styled} from '../ui';
import {theme} from './theme';

const appTooltip = (
  <>
    Inspect apps by selecting connected devices and emulators. Navigate and
    bookmark frequent destinations in the app. Refresh, screenshot and
    screenrecord is also available.
    {
      <Button
        size="small"
        type="link"
        onClick={() => {
          shell.openExternal(
            'https://fbflipper.com/docs/getting-started/index',
          );
        }}>
        Learn More
      </Button>
    }
  </>
);

export function AppInspect() {
  return (
    <LeftSidebar>
      <Layout.Top scrollable>
        <>
          <SidebarTitle actions={<InfoIcon>{appTooltip}</InfoIcon>}>
            App Inspect
          </SidebarTitle>
          <TopSection fillx>
            <DeviceDropdown />
            <Input addonAfter={<SettingOutlined />} defaultValue="mysite" />
            <Layout.Horizontal gap={theme.space.small}>
              <Button icon={<SettingOutlined />} type="link" />
              <Button icon={<SettingOutlined />} type="link" />
              <Button icon={<SettingOutlined />} type="link" />
            </Layout.Horizontal>
          </TopSection>
        </>
        <div>Dynamic section</div>
      </Layout.Top>
    </LeftSidebar>
  );
}

const TopSection = styled(Layout.Vertical)({
  boxShadow: `inset 0px -1px 0px ${theme.dividerColor}`,
  padding: `8px 12px`,
  gap: theme.space.middle,
});

function DeviceDropdown() {
  return (
    <Radio.Group value={1} size="small">
      <Dropdown
        overlay={
          <Menu>
            <Menu.Item icon={<AppleOutlined />} style={{fontWeight: 'bold'}}>
              IPhone 11
            </Menu.Item>
            <Menu.Item>
              <Radio value={1}>Facebook</Radio>
            </Menu.Item>
            <Menu.Item>
              <Radio value={3}>Instagram</Radio>
            </Menu.Item>
            <Menu.Item icon={<AndroidOutlined />} style={{fontWeight: 'bold'}}>
              Android
            </Menu.Item>
          </Menu>
        }>
        <Button icon={<AppleOutlined />} style={{width: '100%'}}>
          Facebook Iphone11
        </Button>
      </Dropdown>
    </Radio.Group>
  );
}
