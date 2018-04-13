/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import styled from '../styled/index.js';
import {Component} from 'react';

const IFrame = styled.customHTMLTag('iframe', {
  height: '100%',
  width: '100%',
  border: 'none',
  background: 'transparent',
  position: 'absolute',
  zIndex: -1,
  top: 0,
  left: 0,
});

export default class ResizeSensor extends Component<{
  onResize: (e: UIEvent) => void,
}> {
  iframe: ?HTMLIFrameElement;

  setRef = (ref: ?HTMLIFrameElement) => {
    this.iframe = ref;
  };

  render() {
    return <IFrame innerRef={this.setRef} />;
  }

  componentDidMount() {
    const {iframe} = this;
    if (iframe != null) {
      iframe.contentWindow.addEventListener('resize', this.handleResize);
    }
  }

  componentWillUnmount() {
    const {iframe} = this;
    if (iframe != null) {
      iframe.contentWindow.removeEventListener('resize', this.handleResize);
    }
  }

  handleResize = () => {
    window.requestAnimationFrame(this.props.onResize);
  };
}
