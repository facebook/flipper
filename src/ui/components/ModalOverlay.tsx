/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import styled from 'react-emotion';
import {Component} from 'react';
import React from 'react';

const Overlay = styled('div')({
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
  onClose: () => void;
  children?: React.ReactNode;
}> {
  ref: HTMLElement | null | undefined;

  setRef = (ref: HTMLElement) => {
    this.ref = ref;
  };

  onClick = (e: React.MouseEvent) => {
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
