/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {MenuOutlined} from '@ant-design/icons';
import {Button, Dropdown, Input} from 'antd';
import React, {memo} from 'react';
import {Layout} from '../Layout';
import {theme} from '../theme';

export const TableSearch = memo(function TableSearch({
  onSearch,
  extraActions,
  contextMenu,
}: {
  onSearch(value: string): void;
  extraActions?: React.ReactElement;
  hasSelection?: boolean;
  contextMenu?: React.ReactElement;
}) {
  return (
    <Layout.Horizontal
      gap
      style={{
        backgroundColor: theme.backgroundWash,
        padding: theme.space.small,
      }}>
      <Input.Search allowClear placeholder="Search..." onSearch={onSearch} />
      {extraActions}
      {contextMenu && (
        <Dropdown overlay={contextMenu} placement="bottomRight">
          <Button type="text" size="small" style={{height: '100%'}}>
            <MenuOutlined />
          </Button>
        </Dropdown>
      )}
    </Layout.Horizontal>
  );
});
