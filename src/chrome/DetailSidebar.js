/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import React from 'react';
import ReactDOM from 'react-dom';
import {Sidebar} from 'flipper';
import {connect} from 'react-redux';
import {toggleRightSidebarAvailable} from '../reducers/application.js';

type Props = {
  children: any,
  rightSidebarVisible: boolean,
  rightSidebarAvailable: boolean,
  toggleRightSidebarAvailable: (visible: boolean) => void,
  width?: number,
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
        <Sidebar width={this.props.width || 300} position="right">
          {this.props.children}
        </Sidebar>,
        domNode,
      )
    );
  }
}

/* $FlowFixMe(>=0.86.0) This
 * comment suppresses an error found when Flow v0.86 was
 * deployed. To see the error, delete this comment and
 * run Flow. */
export default connect(
  ({application: {rightSidebarVisible, rightSidebarAvailable}}) => ({
    rightSidebarVisible,
    rightSidebarAvailable,
  }),
  {
    toggleRightSidebarAvailable,
  },
)(DetailSidebar);
