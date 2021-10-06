/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {Component} from 'react';

import {setActiveSheet} from '../reducers/application';
import {connect} from 'react-redux';

import {State as Store} from '../reducers';

import {ActiveSheet} from '../reducers/application';
import {Modal} from 'antd';

type OwnProps = {
  children: (onHide: () => any) => any;
};

type StateFromProps = {
  activeSheet: ActiveSheet;
};

type DispatchFromProps = {
  onHideSheet: () => void;
};

type Props = OwnProps & StateFromProps & DispatchFromProps;
class Sheet extends Component<Props, {}> {
  render() {
    return (
      <Modal
        visible={!!this.props.activeSheet}
        footer={null}
        onCancel={this.props.onHideSheet}>
        {this.props.children(this.props.onHideSheet)}
      </Modal>
    );
  }
}

export default connect<StateFromProps, DispatchFromProps, OwnProps, Store>(
  ({application: {activeSheet}}) => ({
    activeSheet,
  }),
  {
    onHideSheet: () => setActiveSheet(null),
  },
)(Sheet);
