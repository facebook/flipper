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
import {Layout} from '../ui';
import {Button, Tooltip, Typography} from 'antd';
import {InfoCircleOutlined} from '@ant-design/icons';

export const LeftSidebar: React.FC = ({children}) => (
  <Layout.Container borderRight padv="small">
    <Layout.Vertical>{children}</Layout.Vertical>
  </Layout.Container>
);

export function SidebarTitle({
  children,
  actions,
}: {
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <LeftMenuTitle center>
      <Typography.Text>{children}</Typography.Text>
      <>{actions}</>
    </LeftMenuTitle>
  );
}

const LeftMenuTitle = styled(Layout.Horizontal)({
  padding: `0px ${theme.inlinePaddingH}px`,
  lineHeight: `${theme.space.large}px`,
  fontSize: theme.fontSize.smallBody,
  textTransform: 'uppercase',
  '> :first-child': {
    flex: 1,
  },
});

export const InfoIcon: React.FC<{}> = ({children}) => (
  <Tooltip placement="bottom" title={children} mouseEnterDelay={0.5}>
    <Button
      size="small"
      type="link"
      icon={<InfoCircleOutlined color={theme.textColorSecondary} />}></Button>
  </Tooltip>
);
