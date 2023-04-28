/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {useMemo, useState} from 'react';
import styled from '@emotion/styled';
import React from 'react';
import {
  Button,
  Checkbox,
  Dropdown,
  Menu,
  Typography,
  Input,
  Switch,
} from 'antd';
import {
  FilterFilled,
  FilterOutlined,
  MinusCircleOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons';

import {theme} from '../theme';
import type {DataTableColumn} from './DataTable';
import {Layout} from '../Layout';
import type {DataTableDispatch} from './DataTableManager';

const {Text} = Typography;

export function FilterIcon({
  column,
  dispatch,
}: {
  column: DataTableColumn<any>;
  dispatch: DataTableDispatch;
}) {
  const [input, setInput] = useState('');
  const {filters} = column;
  const isActive = useMemo(() => filters?.some((f) => f.enabled), [filters]);

  const onAddFilter = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    dispatch({
      type: 'addColumnFilter',
      column: column.key,
      value: input,
    });
    setInput('');
  };

  const menu = (
    <Menu
      onMouseDown={(e) => {
        e.stopPropagation(); // prevents interaction accidentally with the Interactive component organizing resizng
      }}>
      <Menu.Item key="addFilter">
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
          <Button
            onClick={onAddFilter}
            title="Add filter"
            type="ghost"
            style={{padding: '4px 8px'}}>
            <PlusCircleOutlined />
          </Button>
        </Layout.Right>
      </Menu.Item>
      <Menu.Divider />
      {filters?.length ? (
        filters?.map((filter, index) => (
          <Menu.Item key={index}>
            <Layout.Right center>
              <FilterCheckbox
                checked={filter.enabled}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  dispatch({
                    type: 'toggleColumnFilter',
                    column: column.key,
                    index,
                  });
                }}>
                {filter.label}
              </FilterCheckbox>
              {!filter.predefined && (
                <MinusCircleOutlined
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({
                      type: 'removeColumnFilter',
                      column: column.key,
                      index,
                    });
                  }}
                />
              )}
            </Layout.Right>
          </Menu.Item>
        ))
      ) : (
        <Menu.Item disabled key="nofilters">
          <Text type="secondary" style={{margin: 12}}>
            No active filters
          </Text>
        </Menu.Item>
      )}
      <Menu.Divider />
      <Menu.Item key="inverse">
        <Layout.Horizontal
          gap
          center
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}>
          <Switch
            checked={!!column.inversed}
            size="small"
            onChange={(inversed) => {
              dispatch({
                type: 'setColumnFilterInverse',
                column: column.key,
                inversed,
              });
            }}
          />
          Exclude items matching filter
        </Layout.Horizontal>
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item disabled key="fromselection">
        <div style={{textAlign: 'right'}}>
          <Button
            type="link"
            style={{fontWeight: 'unset'}}
            onClick={() => {
              dispatch({
                type: 'setColumnFilterFromSelection',
                column: column.key,
              });
            }}>
            From selection
          </Button>
          <Button
            type="link"
            style={{fontWeight: 'unset'}}
            onClick={() => {
              filters?.forEach((f, index) => {
                if (!f.enabled) {
                  dispatch({
                    type: 'toggleColumnFilter',
                    column: column.key,
                    index,
                  });
                }
              });
            }}>
            All
          </Button>
          <Button
            type="link"
            style={{fontWeight: 'unset'}}
            onClick={() => {
              filters?.forEach((f, index) => {
                if (f.enabled)
                  dispatch({
                    type: 'toggleColumnFilter',
                    column: column.key,
                    index,
                  });
              });
            }}>
            None
          </Button>
        </div>
      </Menu.Item>
    </Menu>
  );

  return (
    <Dropdown overlay={menu} trigger={['click']}>
      <FilterButton isActive={isActive}>
        {isActive ? <FilterFilled /> : <FilterOutlined />}
      </FilterButton>
    </Dropdown>
  );
}

export const FilterButton = styled.div<{isActive?: boolean}>(({isActive}) => ({
  backgroundColor: theme.backgroundWash,
  visibility: isActive ? 'visible' : 'hidden',
  color: isActive ? theme.primaryColor : theme.disabledColor,
  cursor: 'pointer',
  marginRight: 4,
  zIndex: 1,
  '&:hover': {
    color: theme.textColorActive,
    backgroundColor: theme.backgroundWash,
  },
}));

const FilterCheckbox = styled(Checkbox)({
  maxWidth: 600,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});
