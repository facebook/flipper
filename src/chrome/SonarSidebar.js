/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import React from 'react';
import ReactDOM from 'react-dom';
import {Sidebar} from 'sonar';
import {connect} from 'react-redux';
import {toggleRightSidebarAvailable} from '../reducers/application.js';

type Props = {
  children: any,
  rightSidebarVisible: boolean,
  rightSidebarAvailable: boolean,
  toggleRightSidebarAvailable: (visible: boolean) => void,
};

class SonarSidebar extends React.Component<Props> {
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
    const domNode = document.getElementById('sonarSidebar');
    return (
      this.props.children &&
      this.props.rightSidebarVisible &&
      domNode &&
      ReactDOM.createPortal(
        <Sidebar width={300} position="right">
          {this.props.children}
        </Sidebar>,
        domNode,
      )
    );
  }
}

export default connect(
  ({application: {rightSidebarVisible, rightSidebarAvailable}}) => ({
    rightSidebarVisible,
    rightSidebarAvailable,
  }),
  {
    toggleRightSidebarAvailable,
  },
)(SonarSidebar);
