/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {Component} from 'react';
import {Transition} from 'react-transition-group';
import {TransitionStatus} from 'react-transition-group/Transition';
import {setActiveSheet} from '../reducers/application';
import {connect} from 'react-redux';
import {styled} from '../ui';
import {PLUGIN_SHEET_ELEMENT_ID} from '../ui/components/Sheet';
import {ACTIVE_SHEET_PLUGIN_SHEET} from '../reducers/application';
import {State as Store} from '../reducers';

import {ActiveSheet} from '../reducers/application';

const DialogContainer = styled.div<{state: TransitionStatus}>(({state}) => ({
  transform: `translate(-50%, ${
    state === 'entering' || state === 'exiting' || state === 'exited'
      ? 'calc(-100% - 20px)'
      : '0%'
  })`,
  opacity: state === 'exited' ? 0 : 1,
  transition: '.3s transform',
  position: 'absolute',
  left: '50%',
  top: 38,
  zIndex: 5,
  backgroundColor: '#EFEEEF',
  border: '1px solid #C6C6C6',
  borderTop: 'none',
  borderBottomLeftRadius: 2,
  borderBottomRightRadius: 2,
  boxShadow: '0 5px 13px rgba(0, 0, 0, 0.2)',
}));

type OwnProps = {
  children: (onHide: () => any) => any;
};

type StateFromProps = {
  activeSheet: ActiveSheet;
};

type DispatchFromProps = {
  onHideSheet: () => void;
};

type State = {
  isVisible: boolean;
};

type Props = OwnProps & StateFromProps & DispatchFromProps;
class Sheet extends Component<Props, State> {
  state = {
    isVisible: Boolean(this.props.activeSheet),
  };

  static getDerivedStateFromProps(props: Props) {
    if (!props.activeSheet) {
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
    // When switching to Sandy, we need to short-circuit this as this component itself will be thrown away
    this.props.onHideSheet();
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
        in={Boolean(this.props.activeSheet) && this.state.isVisible}
        timeout={0}
        onExited={() => this.props.onHideSheet()}>
        {(state) => (
          <DialogContainer state={state}>
            <div
              /* This is the target for React.portal, it should not be
               * unmounted, therefore it's hidden, when another sheet
               * is presented. */
              id={PLUGIN_SHEET_ELEMENT_ID}
              style={{
                display:
                  this.props.activeSheet === ACTIVE_SHEET_PLUGIN_SHEET
                    ? 'block'
                    : 'none',
              }}
            />
            {this.props.children(this.onHide)}
          </DialogContainer>
        )}
      </Transition>
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
