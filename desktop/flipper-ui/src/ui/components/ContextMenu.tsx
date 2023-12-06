/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import * as React from 'react';
import {Menu, Dropdown} from 'antd';
import {createElement, useCallback, forwardRef, Ref, ReactElement} from 'react';
import FlexColumn from './FlexColumn';
import {CheckOutlined} from '@ant-design/icons';

export type ContextMenuItem =
  | {
      readonly label: string;
      readonly click?: () => void;
      readonly role?: string;
      readonly enabled?: boolean;
      readonly type?: 'normal' | 'checkbox';
      readonly checked?: boolean;
    }
  | {
      readonly type: 'separator';
    }
  | {
      readonly label: string;
      readonly submenu: MenuTemplate;
    };

export type MenuTemplate = ReadonlyArray<ContextMenuItem>;

type Props<C> = {
  /** List of items in the context menu. Used for static menus. */
  items?: MenuTemplate;
  /** Function to generate the menu. Called right before the menu is showed. Used for dynamic menus. */
  buildItems?: () => MenuTemplate;
  /** Nodes that should have a context menu */
  children: React.ReactNode;
  /** The component that is used to wrap the children. Defaults to `FlexColumn`. */
  component?: React.ComponentType<any> | string;
  onMouseDown?: (e: React.MouseEvent) => any;
} & C;

const contextMenuTrigger = ['contextMenu' as const];

/**
 * Native context menu that is shown on secondary click.
 *
 * Separators can be added by `{type: 'separator'}`
 * @depreacted https://ant.design/components/dropdown/#components-dropdown-demo-context-menu
 */
export default forwardRef(function ContextMenu<C>(
  {items, buildItems, component, children, ...otherProps}: Props<C>,
  ref: Ref<any> | null,
) {
  const onContextMenu = useCallback(() => {
    return createContextMenu(items ?? buildItems?.() ?? []);
  }, [items, buildItems]);

  return (
    <Dropdown overlay={onContextMenu} trigger={contextMenuTrigger}>
      {createElement(
        component || FlexColumn,
        {
          ref,
          ...otherProps,
        },
        children,
      )}
    </Dropdown>
  );
}) as <T>(p: Props<T> & {ref?: Ref<any>}) => ReactElement;

export function createContextMenu(items: MenuTemplate) {
  return <Menu>{items.map(createMenuItem)}</Menu>;
}

function createMenuItem(item: ContextMenuItem, idx: number) {
  if ('type' in item && item.type === 'separator') {
    return <Menu.Divider key={idx} />;
  } else if ('submenu' in item) {
    return (
      <Menu.SubMenu key={idx} title={item.label}>
        {item.submenu.map(createMenuItem)}
      </Menu.SubMenu>
    );
  } else if ('label' in item) {
    return (
      <Menu.Item
        key={idx}
        onClick={item.click}
        disabled={item.enabled === false}
        role={item.role}
        icon={
          item.type === 'checkbox' ? (
            <CheckOutlined
              style={{visibility: item.checked ? 'visible' : 'hidden'}}
            />
          ) : undefined
        }>
        {item.label}
      </Menu.Item>
    );
  }
}
