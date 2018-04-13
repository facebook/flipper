/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 * @format
 */

import ContextMenu from './ContextMenu.js';

const invariant = require('invariant');

export default class Dropdown extends ContextMenu {
  trigger: string = 'onClick';

  ref: ?HTMLElement;

  getCoordinates(): {top: number, left: number} {
    const {ref} = this;
    invariant(ref, 'expected ref');

    const rect = ref.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
    };
  }

  setRef = (ref: ?HTMLElement) => {
    this.ref = ref;
  };

  render() {
    return <span ref={this.setRef}>{this.props.children}</span>;
  }
}
