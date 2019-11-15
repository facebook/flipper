/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Component} from 'react';
import styled from 'react-emotion';
import electron, {MenuItemConstructorOptions} from 'electron';
import React from 'react';
import PropTypes from 'prop-types';

type MenuTemplate = Array<MenuItemConstructorOptions>;

const Container = styled('div')({
  display: 'contents',
});
Container.displayName = 'ContextMenuProvider:Container';

/**
 * Flipper's root is already wrapped with this component, so plugins should not
 * need to use this. ContextMenu is what you probably want to use.
 */
export default class ContextMenuProvider extends Component<{
  children: React.ReactNode;
}> {
  static childContextTypes = {
    appendToContextMenu: PropTypes.func,
  };

  getChildContext() {
    return {appendToContextMenu: this.appendToContextMenu};
  }

  _menuTemplate: MenuTemplate = [];

  appendToContextMenu = (items: MenuTemplate) => {
    this._menuTemplate = this._menuTemplate.concat(items);
  };

  onContextMenu = () => {
    const menu = electron.remote.Menu.buildFromTemplate(this._menuTemplate);
    this._menuTemplate = [];
    // @ts-ignore: async is private electron API
    menu.popup({window: electron.remote.getCurrentWindow(), async: true});
  };

  render() {
    return (
      <Container onContextMenu={this.onContextMenu}>
        {this.props.children}
      </Container>
    );
  }
}
