/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import FlexColumn from './FlexColumn';
import {Component} from 'react';
import View from './View';
import styled from '@emotion/styled';
import React from 'react';
import {HeightProperty, TopProperty} from 'csstype';

const Inner = styled(FlexColumn)<{height: HeightProperty<number>}>(
  ({height}) => ({
    alignItems: 'flex-start',
    height,
    minHeight: '100%',
    minWidth: '100%',
    overflow: 'visible',
    width: '100%',
  }),
);
Inner.displayName = 'VirtualList:Inner';

const Content = styled(FlexColumn)<{top: TopProperty<number>}>(({top}) => ({
  alignItems: 'flex-start',
  height: '100%',
  marginTop: top,
  minWidth: '100%',
  overflow: 'visible',
}));
Content.displayName = 'VirtualList:Content';

type VirtualListProps = {
  data: Array<any>;
  renderRow: (data: any, i: number) => any;
  rowHeight: number;
  overscanCount: number;
  sync?: boolean;
  wrapInner?: (data: any) => any;
};

type VirtualListState = {
  offset: number;
  height: number;
};

export default class VirtualList extends Component<
  VirtualListProps,
  VirtualListState
> {
  constructor(props: VirtualListProps, context: Object) {
    super(props, context);
    this.state = {
      height: 0,
      offset: 0,
    };
  }

  static defaultProps = {
    overscanCount: 10,
  };

  ref: HTMLElement | undefined | null;

  setRef = (ref: HTMLElement | null) => {
    this.ref = ref;
  };

  resize = () => {
    if (this.ref && this.state.height !== this.ref.offsetHeight) {
      this.setState({height: this.ref.offsetHeight});
    }
  };

  handleScroll = () => {
    this.setState({offset: this.ref ? this.ref.scrollTop : 0});
    if (this.props.sync === true) {
      this.forceUpdate();
    }
  };

  componentDidUpdate() {
    this.resize();
  }

  componentDidMount() {
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.resize);
  }

  render() {
    const {data, overscanCount, renderRow, rowHeight, wrapInner} = this.props;
    const {height, offset} = this.state;

    // first visible row index
    // eslint-disable-next-line no-bitwise
    let start = (offset / rowHeight) | 0;

    // actual number of visible rows (without overscan)
    // eslint-disable-next-line no-bitwise
    let visibleRowCount = (height / rowHeight) | 0;

    // Overscan: render blocks of rows modulo an overscan row count
    // This dramatically reduces DOM writes during scrolling
    if (overscanCount) {
      start = Math.max(0, start - (start % overscanCount));
      visibleRowCount += overscanCount;
    }

    // last visible + overscan row index
    const end = start + 1 + visibleRowCount;

    // data slice currently in viewport plus overscan items
    const selection = data.slice(start, end);

    let inner = (
      <Inner height={data.length * rowHeight}>
        <Content top={start * rowHeight}>{selection.map(renderRow)}</Content>
      </Inner>
    );

    if (wrapInner) {
      inner = wrapInner(inner);
    }

    return (
      <View
        grow={true}
        onScroll={this.handleScroll}
        ref={this.setRef}
        scrollable={true}>
        {inner}
      </View>
    );
  }
}
