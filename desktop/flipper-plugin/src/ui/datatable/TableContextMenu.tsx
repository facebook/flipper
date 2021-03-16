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
  React.ReactElement | undefined
>(undefined);

export function tableContextMenuFactory<T>(
  visibleColumns: DataTableColumn<T>[],
  addColumnFilter: TableManager['addColumnFilter'],
  _getSelection: () => T,
  getMultiSelection: () => T[],
) {
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
      <SubMenu title="Filter on same..." icon={<FilterOutlined />}>
        {visibleColumns.map((column) => (
          <Item
            key={column.key}
            onClick={() => {
              const items = getMultiSelection();
              if (items.length) {
                items.forEach((item, index) => {
                  addColumnFilter(
                    column.key,
                    normalizeCellValue(item[column.key]),
                    index === 0, // remove existing filters before adding the first
                  );
                });
              }
            }}>
            {column.title || column.key}
          </Item>
        ))}
      </SubMenu>
      <SubMenu title="Copy cell(s)" icon={<CopyOutlined />}>
        {visibleColumns.map((column) => (
          <Item
            key={column.key}
            onClick={() => {
              const items = getMultiSelection();
              if (items.length) {
                lib.writeTextToClipboard(
                  items
                    .map((item) => normalizeCellValue(item[column.key]))
                    .join('\n'),
                );
              }
            }}>
            {column.title || column.key}
          </Item>
        ))}
      </SubMenu>
      <Item
        onClick={() => {
          const items = getMultiSelection();
          if (items.length) {
            lib.writeTextToClipboard(
              JSON.stringify(items.length > 1 ? items : items[0], null, 2),
            );
          }
        }}>
        Copy row(s)
      </Item>
      {lib.isFB && (
        <Item
          onClick={() => {
            const items = getMultiSelection();
            if (items.length) {
              lib.createPaste(
                JSON.stringify(items.length > 1 ? items : items[0], null, 2),
              );
            }
          }}>
          Create paste
        </Item>
      )}
    </Menu>
  );
}
