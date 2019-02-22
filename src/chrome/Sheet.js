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
import {PLUGIN_SHEET_ELEMENT_ID} from '../ui/components/Sheet';
import {ACTIVE_SHEET_PLUGIN_SHEET} from '../reducers/application';

import type {ActiveSheet} from '../reducers/application';

const DialogContainer = styled('div')(({state}) => ({
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
  zIndex: 3,
  backgroundColor: '#EFEEEF',
  border: '1px solid #C6C6C6',
  borderTop: 'none',
  borderBottomLeftRadius: 2,
  borderBottomRightRadius: 2,
  boxShadow: '0 5px 13px rgba(0, 0, 0, 0.2)',
}));

type OwnProps = {|
  children: (onHide: () => mixed) => any,
|};

type Props = {|
  ...OwnProps,
  activeSheet: ActiveSheet,
  onHideSheet: () => void,
|};

type State = {|
  isVisible: boolean,
|};

class Sheet extends Component<Props, State> {
  state = {
    isVisible: Boolean(this.props.activeSheet),
  };

  static getDerivedStateFromProps(props: Props, state: State) {
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
        timeout={300}
        onExited={() => this.props.onHideSheet()}>
        {state => (
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

export default connect<Props, OwnProps, _, _, _, _>(
  ({application: {activeSheet}}) => ({
    activeSheet,
  }),
  {
    onHideSheet: () => setActiveSheet(null),
  },
)(Sheet);
