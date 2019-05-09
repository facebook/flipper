/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import React from 'react';
import ReactDOM from 'react-dom';
import Sidebar from '../ui/components/Sidebar';
import {connect} from 'react-redux';
import {toggleRightSidebarAvailable} from '../reducers/application.js';

type OwnProps = {|
  children: any,
  width?: number,
  minWidth?: number,
|};

type Props = {
  ...OwnProps,
  rightSidebarVisible: boolean,
  rightSidebarAvailable: boolean,
  toggleRightSidebarAvailable: (visible?: boolean) => any,
};

class DetailSidebar extends React.Component<Props> {
  componentDidMount() {
    this.updateSidebarAvailablility();
  }

  componentDidUpdate() {
    this.updateSidebarAvailablility();
  }

  updateSidebarAvailablility() {
    const available = Boolean(this.props.children);
    if (available !== this.props.rightSidebarAvailable) {
      this.props.toggleRightSidebarAvailable(available);
    }
  }

  render() {
    const domNode = document.getElementById('detailsSidebar');
    return (
      this.props.children &&
      this.props.rightSidebarVisible &&
      domNode &&
      ReactDOM.createPortal(
        <Sidebar
          minWidth={this.props.minWidth}
          width={this.props.width || 300}
          position="right">
          {this.props.children}
        </Sidebar>,
        domNode,
      )
    );
  }
}

export default connect<Props, OwnProps, _, _, _, _>(
  ({application: {rightSidebarVisible, rightSidebarAvailable}}) => ({
    rightSidebarVisible,
    rightSidebarAvailable,
  }),
  {
    toggleRightSidebarAvailable,
  },
)(DetailSidebar);
