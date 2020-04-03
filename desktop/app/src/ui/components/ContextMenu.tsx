/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  createElement,
  useContext,
  useCallback,
  forwardRef,
  Ref,
  ReactElement,
} from 'react';
import {ContextMenuContext} from './ContextMenuProvider';
import FlexColumn from './FlexColumn';
import {MenuItemConstructorOptions} from 'electron';

export type MenuTemplate = Array<MenuItemConstructorOptions>;

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

/**
 * Native context menu that is shown on secondary click.
 * Uses [Electron's context menu API](https://electronjs.org/docs/api/menu-item)
 * to show menu items.
 *
 * Separators can be added by `{type: 'separator'}`
 */
export default forwardRef(function ContextMenu<C>(
  {items, buildItems, component, children, ...otherProps}: Props<C>,
  ref: Ref<any> | null,
) {
  const contextMenuManager = useContext(ContextMenuContext);
  const onContextMenu = useCallback(() => {
    if (items != null) {
      contextMenuManager?.appendToContextMenu(items);
    } else if (buildItems != null) {
      contextMenuManager?.appendToContextMenu(buildItems());
    }
  }, [items, buildItems]);
  return createElement(
    component || FlexColumn,
    {
      ref,
      onContextMenu,
      ...otherProps,
    },
    children,
  );
}) as <T>(p: Props<T> & {ref?: Ref<any>}) => ReactElement;
