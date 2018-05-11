/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
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
