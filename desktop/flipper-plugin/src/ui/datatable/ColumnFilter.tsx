/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {useMemo, useState} from 'react';
import React from 'react';
import {theme} from '../theme';
import type {DataTableColumn} from './DataTable';

import {Button, Checkbox, Dropdown, Menu, Typography, Input} from 'antd';
import {FilterFilled, MinusCircleOutlined} from '@ant-design/icons';
import {Layout} from '../Layout';

const {Text} = Typography;

export type ColumnFilterHandlers = {
  onAddColumnFilter(columnId: string, value: string): void;
  onRemoveColumnFilter(columnId: string, index: number): void;
  onToggleColumnFilter(columnId: string, index: number): void;
  onSetColumnFilterFromSelection(columnId: string): void;
};

export function FilterIcon({
  column,
  ...props
}: {column: DataTableColumn<any>} & ColumnFilterHandlers) {
  const [input, setInput] = useState('');
  const {filters} = column;
  const isActive = useMemo(() => filters?.some((f) => f.enabled), [filters]);

  const onAddFilter = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    props.onAddColumnFilter(column.key, input);
    setInput('');
  };

  const menu = (
    <Menu
      onMouseDown={(e) => {
        e.stopPropagation(); // prevents interaction accidentally with the Interactive component organizing resizng
      }}>
      <Menu.Item>
        <Layout.Right gap>
          <Input
            placeholder="Filter by value"
            value={input}
            onChange={(e) => {
              e.stopPropagation();
              setInput(e.target.value);
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            onPressEnter={onAddFilter}
            disabled={false}
          />
          <Button onClick={onAddFilter}>Add</Button>
        </Layout.Right>
      </Menu.Item>
      <Menu.Divider />
      {filters?.length ? (
        filters?.map((filter, index) => (
          <Menu.Item key={index}>
            <Layout.Right center>
              <Checkbox
                checked={filter.enabled}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  props.onToggleColumnFilter(column.key, index);
                }}>
                {filter.label}
              </Checkbox>
              {!filter.predefined && (
                <MinusCircleOutlined
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onRemoveColumnFilter(column.key, index);
                  }}
                />
              )}
            </Layout.Right>
          </Menu.Item>
        ))
      ) : (
        <Text type="secondary" style={{margin: 12}}>
          No active filters
        </Text>
      )}
      <Menu.Divider />
      <div style={{textAlign: 'right'}}>
        <Button
          type="link"
          style={{fontWeight: 'unset'}}
          onClick={() => {
            props.onSetColumnFilterFromSelection(column.key);
          }}>
          From selection
        </Button>
        <Button
          type="link"
          style={{fontWeight: 'unset'}}
          onClick={() => {
            filters?.forEach((f, index) => {
              if (!f.enabled) props.onToggleColumnFilter(column.key, index);
            });
          }}>
          All
        </Button>
        <Button
          type="link"
          style={{fontWeight: 'unset'}}
          onClick={() => {
            filters?.forEach((f, index) => {
              if (f.enabled) props.onToggleColumnFilter(column.key, index);
            });
          }}>
          None
        </Button>
      </div>
    </Menu>
  );

  return (
    <Dropdown overlay={menu} trigger={['click']}>
      <Button
        size="small"
        type="text"
        style={{
          backgroundColor: theme.backgroundWash,
          borderRadius: 0,
          visibility: isActive ? 'visible' : 'hidden',
          color: isActive ? theme.primaryColor : theme.disabledColor,
        }}>
        <FilterFilled />
      </Button>
    </Dropdown>
  );
}
