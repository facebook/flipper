/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {PureComponent} from 'react';
import FlexColumn from './FlexColumn.js';
import styled from '../styled/index.js';
import {colors} from './colors.js';

const Anchor = styled('img')({
  zIndex: 6,
  position: 'absolute',
  bottom: 0,
  left: '50%',
  transform: 'translate(-50%, calc(100% + 2px))',
});

const PopoverContainer = styled(FlexColumn)(props => ({
  backgroundColor: colors.white,
  borderRadius: 7,
  border: '1px solid rgba(0,0,0,0.3)',
  boxShadow: '0 2px 10px 0 rgba(0,0,0,0.3)',
  position: 'absolute',
  zIndex: 5,
  bottom: 0,
  marginTop: 15,
  left: '50%',
  minWidth: props.opts.minWidth || 'auto',
  transform: props.opts.skewLeft
    ? 'translate(calc(-100% + 22px), calc(100% + 15px))'
    : 'translate(-50%, calc(100% + 15px))',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    display: 'block',
    position: 'absolute',
    left: '50%',
    transform: props.opts.skewLeft
      ? 'translateX(calc(-100% + 22px))'
      : 'translateX(-50%)',
    height: 13,
    top: -13,
    width: 26,
    backgroundColor: colors.white,
  },
}));

type Props = {|
  children: React.Node,
  onDismiss: Function,
  forceOpts?: Object,
|};

export default class Popover extends PureComponent<Props> {
  _ref: ?Element;

  componentDidMount() {
    window.document.addEventListener('click', this.handleClick);
    window.document.addEventListener('keydown', this.handleKeydown);
  }

  componentWillUnmount() {
    window.document.addEventListener('click', this.handleClick);
    window.document.addEventListener('keydown', this.handleKeydown);
  }

  handleClick = (e: SyntheticMouseEvent<>) => {
    // $FlowFixMe
    if (this._ref && !this._ref.contains(e.target)) {
      this.props.onDismiss();
    }
  };

  handleKeydown = (e: SyntheticKeyboardEvent<>) => {
    if (e.key === 'Escape') {
      this.props.onDismiss();
    }
  };

  _setRef = (ref: ?Element) => {
    this._ref = ref;
  };

  render() {
    return [
      <Anchor
        src="./anchor.svg"
        key="anchor"
        opts={this.props.forceOpts || {}}
      />,
      <PopoverContainer
        innerRef={this._setRef}
        key="popup"
        opts={this.props.forceOpts || {}}>
        {this.props.children}
      </PopoverContainer>,
    ];
  }
}
