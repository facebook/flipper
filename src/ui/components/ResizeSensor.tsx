/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import styled from '@emotion/styled';
import {Component} from 'react';
import React from 'react';

const IFrame = styled.iframe({
  height: '100%',
  width: '100%',
  border: 'none',
  background: 'transparent',
  position: 'absolute',
  zIndex: -1,
  top: 0,
  left: 0,
});
IFrame.displayName = 'ResizeSensor:IFrame';

/**
 * Listener for resize events.
 */
export default class ResizeSensor extends Component<{
  /** Callback when resize happened */
  onResize: (e: UIEvent) => void;
}> {
  iframe: HTMLIFrameElement | undefined | null;

  setRef = (ref: HTMLIFrameElement | null) => {
    this.iframe = ref;
  };

  render() {
    return <IFrame ref={this.setRef} />;
  }

  componentDidMount() {
    const {iframe} = this;
    if (iframe && iframe.contentWindow != null) {
      iframe.contentWindow.addEventListener('resize', this.handleResize);
    }
  }

  componentWillUnmount() {
    const {iframe} = this;
    if (iframe && iframe.contentWindow != null) {
      iframe.contentWindow.removeEventListener('resize', this.handleResize);
    }
  }

  handleResize = (e: UIEvent) => {
    window.requestAnimationFrame(() => this.props.onResize(e));
  };
}
