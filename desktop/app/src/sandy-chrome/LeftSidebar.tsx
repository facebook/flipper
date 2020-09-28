/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {theme} from './theme';
import styled from '@emotion/styled';
import {Layout, FlexColumn} from '../ui';
import {Button, Tooltip} from 'antd';
import {InfoCircleOutlined} from '@ant-design/icons';

export const LeftSidebar = styled(FlexColumn)({
  background: theme.backgroundDefault,
  flex: 1,
  padding: `10px 0`,
});

export function SidebarTitle({
  children,
  actions,
}: {
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <LeftMenuTitle>
      <Layout.Right center>
        {children}
        <>{actions}</>
      </Layout.Right>
    </LeftMenuTitle>
  );
}

const LeftMenuTitle = styled.div({
  width: '100%',
  fontFamily: 'SF Pro Text',
  padding: `0px 12px`,
  lineHeight: '16px',
  fontSize: '12px',
  textTransform: 'uppercase',
});

export const InfoIcon: React.FC<{}> = ({children}) => (
  <Tooltip placement="bottom" title={children} mouseEnterDelay={0.5}>
    <Button
      size="small"
      type="link"
      icon={<InfoCircleOutlined color={theme.textColorSecondary} />}></Button>
  </Tooltip>
);
