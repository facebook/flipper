/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {Component} from 'react';
import {Transition} from 'react-transition-group';
import {toggleBugDialogVisible} from '../reducers/application.js';
import {connect} from 'react-redux';
import {styled} from 'flipper';

const DialogContainer = styled('div')(({state}) => ({
  transform: `translateY(${
    state === 'entering' || state === 'exiting' ? '-110' : ''
  }%)`,
  transition: '.3s transform',
  position: 'absolute',
  left: '50%',
  marginLeft: -200,
  top: 38,
  zIndex: 2,
  backgroundColor: '#EFEEEF',
  border: '1px solid #C6C6C6',
  borderTop: 'none',
  borderBottomLeftRadius: 2,
  borderBottomRightRadius: 2,
  boxShadow: '0 5px 13px rgba(0, 0, 0, 0.2)',
}));

type Props = {|
  sheetVisible: boolean,
  onHideSheet: () => mixed,
  children: (onHide: () => mixed) => any,
|};

class Sheet extends Component<Props> {
  componentDidMount() {
    document.addEventListener('keydown', this.onKeyDown);
  }
  componentWillUnmount() {
    document.removeEventListener('keydown', this.onKeyDown);
  }

  onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      this.onHide();
    }
  };

  onHide = () => {
    this.props.onHideSheet();
  };

  render() {
    return (
      <Transition in={this.props.sheetVisible} timeout={300} unmountOnExit>
        {state => (
          <DialogContainer state={state}>
            {this.props.children(this.onHide)}
          </DialogContainer>
        )}
      </Transition>
    );
  }
}
/* $FlowFixMe(>=0.86.0) This
 * comment suppresses an error found when Flow v0.86 was
 * deployed. To see the error, delete this comment and
 * run Flow. */
export default connect(
  ({application: {bugDialogVisible}}) => ({
    sheetVisible: bugDialogVisible,
  }),
  {
    onHideSheet: () => toggleBugDialogVisible(false),
  },
)(Sheet);
