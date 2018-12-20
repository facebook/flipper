/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {Component} from 'react';
import {Transition} from 'react-transition-group';
import {setActiveSheet} from '../reducers/application.js';
import {connect} from 'react-redux';
import {styled} from 'flipper';

const DialogContainer = styled('div')(({state}) => ({
  transform: `translate(-50%, ${
    state === 'entering' || state === 'exiting' || state === 'exited'
      ? '-110'
      : '0'
  }%)`,
  transition: '.3s transform',
  position: 'absolute',
  left: '50%',
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
  onHideSheet: () => void,
  children: (onHide: () => mixed) => any,
|};

type State = {|
  isVisible: boolean,
|};

class Sheet extends Component<Props, State> {
  state = {
    isVisible: this.props.sheetVisible,
  };

  static getDerivedStateFromProps(props: Props, state: State) {
    if (!props.sheetVisible) {
      return {
        isVisible: true,
      };
    } else {
      return null;
    }
  }

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
    this.setState({isVisible: false});
  };

  render() {
    return (
      <Transition
        in={this.props.sheetVisible && this.state.isVisible}
        timeout={300}
        onExited={() => this.props.onHideSheet()}
        unmountOnExit>
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
  ({application: {activeSheet}}) => ({
    sheetVisible: Boolean(activeSheet),
  }),
  {
    onHideSheet: () => setActiveSheet(null),
  },
)(Sheet);
