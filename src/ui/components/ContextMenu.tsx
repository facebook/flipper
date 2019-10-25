/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import * as React from 'react';
import FlexColumn from './FlexColumn';
import PropTypes from 'prop-types';
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
  component: React.ComponentType<any> | string;
  onMouseDown?: (e: React.MouseEvent) => any;
} & C;

/**
 * Native context menu that is shown on secondary click.
 * Uses [Electron's context menu API](https://electronjs.org/docs/api/menu-item)
 * to show menu items.
 *
 * Separators can be added by `{type: 'separator'}`
 */
export default class ContextMenu<C = any> extends React.Component<Props<C>> {
  static defaultProps = {
    component: FlexColumn,
  };

  static contextTypes = {
    appendToContextMenu: PropTypes.func,
  };

  onContextMenu = () => {
    if (typeof this.context.appendToContextMenu === 'function') {
      if (this.props.items != null) {
        this.context.appendToContextMenu(this.props.items);
      } else if (this.props.buildItems != null) {
        this.context.appendToContextMenu(this.props.buildItems());
      }
    }
  };

  render() {
    const {
      items: _items,
      buildItems: _buildItems,
      component,
      ...props
    } = this.props;
    return React.createElement(
      component,
      {
        onContextMenu: this.onContextMenu,
        ...props,
      },
      this.props.children,
    );
  }
}
