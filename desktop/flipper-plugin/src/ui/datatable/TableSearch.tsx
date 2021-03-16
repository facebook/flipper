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
import React, {memo, useState} from 'react';
import styled from '@emotion/styled';

import {Layout} from '../Layout';
import {theme} from '../theme';
import {debounce} from 'lodash';
import {useAssertStableRef} from '../../utils/useAssertStableRef';

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
  useAssertStableRef(onSearch, 'onSearch');
  const [search, setSearch] = useState('');
  const [performSearch] = useState(() =>
    debounce(onSearch, 200, {leading: true}),
  );
  return (
    <Searchbar gap>
      <Input.Search
        allowClear
        placeholder="Search..."
        onSearch={performSearch}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          performSearch(e.target.value);
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
