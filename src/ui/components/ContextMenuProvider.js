/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {Component} from 'react';
import styled from '../styled/index.js';
import electron from 'electron';

const PropTypes = require('prop-types');

type MenuTemplate = Array<Electron$MenuItemOptions>;

const Container = styled.view({
  display: 'contents',
});

export default class ContextMenuProvider extends Component<{|
  children: React$Node,
|}> {
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
    menu.popup(electron.remote.getCurrentWindow(), {async: true});
  };

  render() {
    return (
      <Container onContextMenu={this.onContextMenu}>
        {this.props.children}
      </Container>
    );
  }
}
