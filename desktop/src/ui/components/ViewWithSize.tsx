/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Component} from 'react';

type ViewWithSizeProps = {
  onSize: (width: number, height: number) => any;
};

type ViewWithSizeState = {
  width: number;
  height: number;
};

export default class ViewWithSize extends Component<
  ViewWithSizeProps,
  ViewWithSizeState
> {
  constructor(props: ViewWithSizeProps, context: Object) {
    super(props, context);
    this.state = {height: window.innerHeight, width: window.innerWidth};
  }

  _onResize = () => {
    this.setState({height: window.innerHeight, width: window.innerWidth});
  };

  componentDidMount() {
    window.addEventListener('resize', this._onResize);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this._onResize);
  }

  render() {
    return this.props.onSize(this.state.width, this.state.height);
  }
}
