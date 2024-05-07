/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {HistoryOutlined, MenuOutlined, SwapOutlined} from '@ant-design/icons';
import {Button, Dropdown, Input, AutoComplete, InputRef, Tooltip} from 'antd';
import React, {memo, useCallback, useMemo} from 'react';
import styled from '@emotion/styled';

import {Layout} from '../Layout';
import {theme} from '../theme';
import type {DataTableDispatch} from './DataTableManager';

const MAX_RECENT = 5;

export const TableSearch = memo(function TableSearch({
  searchValue,
  useRegex,
  filterSearchHistory,
  showHistory,
  showNumbered,
  dispatch,
  searchHistory,
  extraActions,
  contextMenu,
  searchInputRef,
}: {
  searchValue: string;
  useRegex: boolean;
  filterSearchHistory: boolean;
  showHistory: boolean;
  showNumbered: boolean;
  dispatch: DataTableDispatch<any>;
  searchHistory: string[];
  extraActions?: React.ReactElement;
  contextMenu: undefined | (() => JSX.Element);
  searchInputRef?: React.MutableRefObject<InputRef>;
}) {
  const filteredSearchHistory = useMemo(
    () =>
      filterSearchHistory
        ? searchHistory.filter(
            (value) =>
              value.toUpperCase().indexOf(searchValue.toUpperCase()) !== -1,
          )
        : searchHistory,
    [filterSearchHistory, searchHistory, searchValue],
  );

  const options = useMemo(() => {
    return filteredSearchHistory.map((value, index) => ({
      label:
        showNumbered && index < MAX_RECENT ? `${index + 1}: ${value}` : value,
      value,
    }));
  }, [filteredSearchHistory, showNumbered]);

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
  const toggleSearchDropdown = useCallback(
    (show: boolean) => {
      dispatch({type: 'showSearchDropdown', show});
    },
    [dispatch],
  );
  const toggleShowNumberedHistory = useCallback(
    (showNumberedHistory: boolean) => {
      dispatch({type: 'setShowNumberedHistory', showNumberedHistory});
    },
    [dispatch],
  );
  const toggleHideResults = useCallback(() => {
    dispatch({type: 'toggleSearchValue'});
  }, [dispatch]);
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<any>) => {
      switch (e.key) {
        case 'f':
          if (e.ctrlKey && searchHistory.length > 0) {
            if (!showHistory) {
              toggleShowNumberedHistory(true);
            }
            toggleSearchDropdown(!showHistory);
          }
          break;
        case 'Control':
          if (showHistory) {
            toggleShowNumberedHistory(true);
          }
          break;
        default:
          const possNumber = Number(e.key);
          if (
            e.ctrlKey &&
            possNumber &&
            showNumbered &&
            possNumber <= Math.min(MAX_RECENT, filteredSearchHistory.length)
          ) {
            toggleSearchDropdown(false);
            onSearch(filteredSearchHistory[possNumber - 1], false);
            e.preventDefault();
          }
      }
      e.stopPropagation();
    },
    [
      searchHistory.length,
      showHistory,
      showNumbered,
      filteredSearchHistory,
      toggleSearchDropdown,
      toggleShowNumberedHistory,
      onSearch,
    ],
  );
  const onKeyUp = useCallback(
    (e: React.KeyboardEvent<any>) => {
      switch (e.key) {
        case 'Control':
          toggleShowNumberedHistory(false);
          break;
      }
      e.stopPropagation();
      e.preventDefault();
    },
    [toggleShowNumberedHistory],
  );
  const regexError = useMemo(() => {
    if (!useRegex || !searchValue) {
      return;
    }
    try {
      new RegExp(searchValue);
    } catch (e) {
      return `${e}`;
    }
  }, [useRegex, searchValue]);

  return (
    <Searchbar gap onKeyDown={onKeyDown} onKeyUp={onKeyUp}>
      <AutoComplete
        defaultOpen={false}
        open={showHistory}
        options={options}
        onSelect={(value: string) => {
          toggleSearchDropdown(false);
          onSearch(value, false);
        }}
        onDropdownVisibleChange={(open) => {
          if (!open) {
            toggleSearchDropdown(false);
          }
        }}
        value={searchValue}>
        <Input.Search
          allowClear
          ref={searchInputRef}
          value={searchValue}
          placeholder="Search..."
          suffix={
            <>
              {options.length ? (
                <Tooltip
                  placement="topLeft"
                  title="Show search history (ctrl+f)">
                  <RegexButton
                    onClick={() => {
                      toggleSearchDropdown(!showHistory);
                    }}>
                    <HistoryOutlined />
                  </RegexButton>
                </Tooltip>
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
              <Tooltip
                placement="topRight"
                title="Show/Hide search results (ctrl+t)">
                <RegexButton
                  onClick={() => {
                    toggleHideResults();
                  }}>
                  <SwapOutlined />
                </RegexButton>
              </Tooltip>
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
