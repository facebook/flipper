/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import styled from '../styled/index.js';
import {Component} from 'react';

const Overlay = styled.view({
  alignItems: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  bottom: 0,
  display: 'flex',
  justifyContent: 'center',
  left: 0,
  position: 'absolute',
  right: 0,
  top: 0,
  zIndex: 99999,
});

export default class ModalOverlay extends Component<{
  onClose: () => void,
  children?: React$Node,
}> {
  ref: HTMLElement;

  setRef = (ref: HTMLElement) => {
    this.ref = ref;
  };

  onClick = (e: SyntheticMouseEvent<>) => {
    if (e.target === this.ref) {
      this.props.onClose();
    }
  };

  render() {
    const {props} = this;

    return (
      <Overlay innerRef={this.setRef} onClick={this.onClick}>
        {props.children}
      </Overlay>
    );
  }
}
