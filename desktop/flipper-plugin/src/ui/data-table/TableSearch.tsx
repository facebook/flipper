/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {HistoryOutlined, MenuOutlined} from '@ant-design/icons';
import {Button, Dropdown, Input, AutoComplete} from 'antd';
import React, {memo, useCallback, useMemo, useState} from 'react';
import styled from '@emotion/styled';

import {Layout} from '../Layout';
import {theme} from '../theme';
import type {DataTableDispatch} from './DataTableManager';

export const TableSearch = memo(function TableSearch({
  searchValue,
  useRegex,
  filterSearchHistory,
  dispatch,
  searchHistory,
  extraActions,
  contextMenu,
}: {
  searchValue: string;
  useRegex: boolean;
  filterSearchHistory: boolean;
  dispatch: DataTableDispatch<any>;
  searchHistory: string[];
  extraActions?: React.ReactElement;
  contextMenu: undefined | (() => JSX.Element);
}) {
  const [showHistory, setShowHistory] = useState(false);
  const onSearch = useCallback(
    (value: string, addToHistory: boolean) => {
      dispatch({type: 'setSearchValue', value, addToHistory});
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

  const options = useMemo(
    () => searchHistory.map((value) => ({label: value, value})),
    [searchHistory],
  );

  return (
    <Searchbar gap>
      <AutoComplete
        defaultOpen={false}
        open={showHistory}
        options={options}
        filterOption={(inputValue, option) =>
          !filterSearchHistory ||
          option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
        }
        onSelect={(value: string) => {
          setShowHistory(false);
          onSearch(value, false);
        }}
        onDropdownVisibleChange={(open) => {
          if (!open) {
            setShowHistory(false);
          }
        }}
        value={searchValue}>
        <Input.Search
          allowClear
          placeholder="Search..."
          suffix={
            <>
              {options.length ? (
                <RegexButton
                  onClick={() => {
                    setShowHistory((v) => !v);
                  }}>
                  <HistoryOutlined />
                </RegexButton>
              ) : null}
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
            </>
          }
          onChange={(e) => {
            onSearch(e.target.value, false);
          }}
          onSearch={(value) => {
            onSearch(value, true);
          }}
        />
      </AutoComplete>
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
  '> .ant-select': {
    flex: 1,
  },
});

const RegexButton = styled(Button)({
  padding: '0px !important',
  borderRadius: 4,
  // marginRight: -6,
  // marginLeft: 4,
  lineHeight: '20px',
  width: 16,
  height: 20,
  border: 'none',
  color: theme.disabledColor,
  '& :hover': {
    color: theme.primaryColor,
  },
});
