/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 * @format
 */

import ContextMenu from './ContextMenu.js';

export default class InlineContextMenu extends ContextMenu {
  render() {
    return <span>{this.props.children}</span>;
  }
}
