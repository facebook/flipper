/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {CopyOutlined, FilterOutlined, TableOutlined} from '@ant-design/icons';
import {Badge, Checkbox, Menu, Select, Switch} from 'antd';
import {Layout} from 'flipper-plugin';
import {
  DataTableDispatch,
  getSelectedItem,
  getSelectedItems,
  getValueAtPath,
  SearchHighlightSetting,
  Selection,
} from './DataTableManager';
import React from 'react';
import {
  _tryGetFlipperLibImplementation,
  _DataSourceView,
} from 'flipper-plugin-core';
import {DataTableColumn} from './DataTable';
import {toFirstUpper} from '../../utils/toFirstUpper';
import {renderColumnValue} from './TableRow';
import {textContent} from '../../utils/textContent';
import {theme} from '../theme';

const {Item, SubMenu} = Menu;
const {Option} = Select;

export function tableContextMenuFactory<T extends object>(
  dataView: _DataSourceView<T, T[keyof T]>,
  dispatch: DataTableDispatch<T>,
  selection: Selection,
  highlightSearchSetting: SearchHighlightSetting,
  filterSearchHistory: boolean,
  columns: DataTableColumn<T>[],
  visibleColumns: DataTableColumn<T>[],
  onCopyRows: (
    rows: T[],
    visibleColumns: DataTableColumn<T>[],
  ) => string = defaultOnCopyRows,
  onContextMenu?: (selection: undefined | T) => React.ReactElement,
  sideBySideOption?: React.ReactElement,
) {
  const lib = _tryGetFlipperLibImplementation();
  if (!lib) {
    return (
      <Menu>
        <Item>Menu not ready</Item>
      </Menu>
    );
  }
  const hasSelection = selection.items.size > 0 ?? false;
  return (
    <Menu>
      {onContextMenu
        ? onContextMenu(getSelectedItem(dataView, selection))
        : null}
      <SubMenu
        key="filter same"
        title="Filter on same"
        icon={<FilterOutlined />}
        disabled={!hasSelection}>
        {visibleColumns.map((column, idx) => (
          <Item
            key={column.key ?? idx}
            onClick={() => {
              dispatch({
                type: 'setColumnFilterFromSelection',
                column: column.key,
              });
            }}>
            {friendlyColumnTitle(column)}
          </Item>
        ))}
      </SubMenu>
      <SubMenu
        key="copy rows"
        title="Copy row(s)"
        icon={<TableOutlined />}
        disabled={!hasSelection}>
        <Item
          key="copyToClipboard"
          disabled={!hasSelection}
          onClick={() => {
            const items = getSelectedItems(dataView, selection);
            if (items.length) {
              lib.writeTextToClipboard(onCopyRows(items, visibleColumns));
            }
          }}>
          Copy row(s)
        </Item>
        {lib.isFB && (
          <Item
            key="createPaste"
            disabled={!hasSelection}
            onClick={() => {
              const items = getSelectedItems(dataView, selection);
              if (items.length) {
                lib.createPaste(onCopyRows(items, visibleColumns));
              }
            }}>
            Create paste
          </Item>
        )}
        <Item
          key="copyToClipboardJSON"
          disabled={!hasSelection}
          onClick={() => {
            const items = getSelectedItems(dataView, selection);
            if (items.length) {
              lib.writeTextToClipboard(rowsToJson(items));
            }
          }}>
          Copy row(s) (JSON)
        </Item>
        {lib.isFB && (
          <Item
            key="createPasteJSON"
            disabled={!hasSelection}
            onClick={() => {
              const items = getSelectedItems(dataView, selection);
              if (items.length) {
                lib.createPaste(rowsToJson(items));
              }
            }}>
            Create paste (JSON)
          </Item>
        )}
      </SubMenu>

      <SubMenu
        key="copy cells"
        title="Copy cell(s)"
        icon={<CopyOutlined />}
        disabled={!hasSelection}>
        {visibleColumns.map((column, idx) => (
          <Item
            key={'copy cell' + (column.key ?? idx)}
            onClick={() => {
              const items = getSelectedItems(dataView, selection);
              if (items.length) {
                lib.writeTextToClipboard(
                  items
                    .map((item) => '' + getValueAtPath(item, column.key))
                    .join('\n'),
                );
              }
            }}>
            {friendlyColumnTitle(column)}
          </Item>
        ))}
      </SubMenu>
      <Menu.Divider />
      <SubMenu title="Visible columns" key="visible columns">
        {columns.map((column, idx) => (
          <Menu.Item key={'visible column ' + (column.key ?? idx)}>
            <Checkbox
              checked={column.visible}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                dispatch({type: 'toggleColumnVisibility', column: column.key});
              }}>
              {friendlyColumnTitle(column)}
            </Checkbox>
          </Menu.Item>
        ))}
      </SubMenu>
      <Menu.Item
        key="resetFilters"
        onClick={() => {
          dispatch({type: 'resetFilters'});
        }}>
        Reset filters
      </Menu.Item>
      <Menu.Item
        key="reset"
        onClick={() => {
          dispatch({type: 'reset'});
        }}>
        Reset view
      </Menu.Item>

      <SubMenu title="Search Options" key="search options">
        <Menu.Item
          key="clear history"
          onClick={() => {
            dispatch({type: 'clearSearchHistory'});
          }}>
          Clear search history
        </Menu.Item>
        <Menu.Item key="highlight search setting">
          <Layout.Horizontal
            gap
            center
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}>
            Highlight search terms
            <Switch
              checked={highlightSearchSetting.highlightEnabled}
              size="small"
              onChange={() => {
                dispatch({
                  type: 'toggleHighlightSearch',
                });
              }}
            />
          </Layout.Horizontal>
        </Menu.Item>
        <Menu.Item key="highlight search color">
          <Layout.Horizontal
            gap
            center
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}>
            Highlight search color
            <Select
              style={{width: '7em'}}
              defaultValue={highlightSearchSetting.color}
              onChange={(color: string) => {
                dispatch({
                  type: 'setSearchHighlightColor',
                  color: color,
                });
              }}>
              {Object.entries(theme.searchHighlightBackground).map(
                ([colorName, color]) => (
                  <Option key={colorName} value={color}>
                    <Badge
                      text={
                        <span style={{backgroundColor: color}}>
                          {colorName.charAt(0).toUpperCase() +
                            colorName.slice(1)}
                        </span>
                      }
                      color={color}
                    />
                  </Option>
                ),
              )}
            </Select>
          </Layout.Horizontal>
        </Menu.Item>
        <Menu.Item key="toggle search auto complete">
          <Layout.Horizontal
            gap
            center
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}>
            Filter Search History
            <Switch
              checked={filterSearchHistory}
              size="small"
              onChange={() => {
                dispatch({
                  type: 'toggleFilterSearchHistory',
                });
              }}
            />
          </Layout.Horizontal>
        </Menu.Item>
      </SubMenu>
      {sideBySideOption}
    </Menu>
  );
}

function friendlyColumnTitle(column: DataTableColumn<any>): string {
  const name = column.title || column.key;
  return toFirstUpper(name);
}

function defaultOnCopyRows<T extends object>(
  items: T[],
  visibleColumns: DataTableColumn<T>[],
) {
  return (
    visibleColumns.map(friendlyColumnTitle).join('\t') +
    '\n' +
    items
      .map((row, idx) =>
        visibleColumns
          .map((col) => textContent(renderColumnValue(col, row, true, idx)))
          .join('\t'),
      )
      .join('\n')
  );
}

function rowsToJson<T>(items: T[]) {
  return JSON.stringify(items.length > 1 ? items : items[0], null, 2);
}
