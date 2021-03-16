/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {CopyOutlined, FilterOutlined} from '@ant-design/icons';
import {Menu} from 'antd';
import {DataTableColumn} from './DataTable';
import {TableManager} from './useDataTableManager';
import React from 'react';
import {createContext} from 'react';
import {normalizeCellValue} from './TableRow';
import {tryGetFlipperLibImplementation} from '../../plugin/FlipperLib';

const {Item, SubMenu} = Menu;

export const TableContextMenuContext = createContext<
  undefined | ((item: any) => React.ReactElement)
>(undefined);

export function tableContextMenuFactory<T>(
  visibleColumns: DataTableColumn<T>[],
  addColumnFilter: TableManager['addColumnFilter'],
) {
  return function (item: any) {
    const lib = tryGetFlipperLibImplementation();
    if (!lib) {
      return (
        <Menu>
          <Item>Menu not ready</Item>
        </Menu>
      );
    }
    return (
      <Menu>
        <SubMenu title="Filter on" icon={<FilterOutlined />}>
          {visibleColumns.map((column) => (
            <Item
              key={column.key}
              onClick={() => {
                addColumnFilter(
                  column.key,
                  normalizeCellValue(item[column.key]),
                  true,
                );
              }}>
              {column.title || column.key}
            </Item>
          ))}
        </SubMenu>
        <SubMenu title="Copy cell" icon={<CopyOutlined />}>
          {visibleColumns.map((column) => (
            <Item
              key={column.key}
              onClick={() => {
                lib.writeTextToClipboard(normalizeCellValue(item[column.key]));
              }}>
              {column.title || column.key}
            </Item>
          ))}
        </SubMenu>
        <Item
          onClick={() => {
            lib.writeTextToClipboard(JSON.stringify(item, null, 2));
          }}>
          Copy row
        </Item>
        {lib.isFB && (
          <Item
            onClick={() => {
              lib.createPaste(JSON.stringify(item, null, 2));
            }}>
            Create paste
          </Item>
        )}
      </Menu>
    );
  };
}
