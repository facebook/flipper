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
import React, {memo, useCallback} from 'react';
import styled from '@emotion/styled';

import {Layout} from '../Layout';
import {theme} from '../theme';
import type {DataTableDispatch} from './DataTableManager';

export const TableSearch = memo(function TableSearch({
  searchValue,
  dispatch,
  extraActions,
  contextMenu,
}: {
  searchValue: string;
  dispatch: DataTableDispatch<any>;
  extraActions?: React.ReactElement;
  contextMenu: undefined | (() => JSX.Element);
}) {
  const onSearch = useCallback(
    (value: string) => {
      dispatch({type: 'setSearchValue', value});
    },
    [dispatch],
  );
  return (
    <Searchbar gap>
      <Input.Search
        allowClear
        placeholder="Search..."
        onSearch={onSearch}
        value={searchValue}
        onChange={(e) => {
          onSearch(e.target.value);
        }}
      />
      {extraActions}
      {contextMenu && (
        <Dropdown overlay={contextMenu} placement="bottomRight">
          <Button type="text" size="small" style={{height: '100%'}}>
            <MenuOutlined />
          </Button>
        </Dropdown>
      )}
    </Searchbar>
  );
});

const Searchbar = styled(Layout.Horizontal)({
  backgroundColor: theme.backgroundWash,
  padding: theme.space.small,
  '.ant-btn': {
    padding: `${theme.space.tiny}px ${theme.space.small}px`,
    background: 'transparent',
  },
});
