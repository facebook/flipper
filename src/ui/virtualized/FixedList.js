/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {RowRenderer, OnScroll, KeyMapper} from './types.js';
import DynamicList from './DynamicList.js';
import {PureComponent} from 'react';

type FixedListProps = {
  pureData: any,
  rowCount: number,
  rowHeight: number,
  rowRenderer: RowRenderer,
  onScroll?: OnScroll,
  keyMapper: KeyMapper,
  innerRef?: (ref: DynamicList) => void,
  onMount?: () => void,
  sideScrollable?: boolean,
};

export default class FixedList extends PureComponent<FixedListProps> {
  getPrecalculatedDimensions = () => {
    return {
      height: this.props.rowHeight,
      width: '100%',
    };
  };

  render() {
    return (
      <DynamicList
        ref={(this.props.innerRef: any)}
        onMount={this.props.onMount}
        pureData={this.props.pureData}
        rowCount={this.props.rowCount}
        rowRenderer={this.props.rowRenderer}
        keyMapper={this.props.keyMapper}
        onScroll={this.props.onScroll}
        sideScrollable={this.props.sideScrollable}
        getPrecalculatedDimensions={this.getPrecalculatedDimensions}
      />
    );
  }
}
