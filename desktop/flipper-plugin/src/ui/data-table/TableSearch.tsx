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
import React, {memo, useCallback, useMemo} from 'react';
import styled from '@emotion/styled';

import {Layout} from '../Layout';
import {theme} from '../theme';
import type {DataTableDispatch} from './DataTableManager';

export const TableSearch = memo(function TableSearch({
  searchValue,
  useRegex,
  dispatch,
  extraActions,
  contextMenu,
}: {
  searchValue: string;
  useRegex: boolean;
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
  const onToggleRegex = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      dispatch({type: 'toggleUseRegex'});
    },
    [dispatch],
  );
  const regexError = useMemo(() => {
    if (!useRegex || !searchValue) {
      return;
    }
    try {
      new RegExp(searchValue);
    } catch (e) {
      return '' + e;
    }
  }, [useRegex, searchValue]);

  return (
    <Searchbar gap>
      <Input.Search
        allowClear
        placeholder="Search..."
        onSearch={onSearch}
        value={searchValue}
        suffix={
          <RegexButton
            size="small"
            onClick={onToggleRegex}
            style={
              useRegex
                ? {
                    background: regexError
                      ? theme.errorColor
                      : theme.successColor,
                    color: theme.white,
                  }
                : {
                    color: theme.disabledColor,
                  }
            }
            type="default"
            title={regexError || 'Search using Regex'}>
            .*
          </RegexButton>
        }
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
  '.ant-input-affix-wrapper': {
    height: 32,
  },
  '.ant-btn': {
    padding: `${theme.space.tiny}px ${theme.space.small}px`,
    background: 'transparent',
  },
});

const RegexButton = styled(Button)({
  padding: '0px !important',
  borderRadius: 4,
  marginRight: -6,
  marginLeft: 4,
  lineHeight: '20px',
  width: 20,
  height: 20,
  border: 'none',
  '& :hover': {
    color: theme.primaryColor,
  },
});
