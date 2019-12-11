/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {PureComponent} from 'react';
import FlexColumn from './FlexColumn';
import styled from '@emotion/styled';
import {colors} from './colors';

const Anchor = styled.img({
  zIndex: 6,
  position: 'absolute',
  bottom: 0,
  left: '50%',
  transform: 'translate(-50%, calc(100% + 2px))',
});
Anchor.displayName = 'Popover.Anchor';

type Opts = {
  minWidth?: number;
  skewLeft?: boolean;
};

const PopoverContainer = styled(FlexColumn)<{opts?: Opts}>(props => ({
  backgroundColor: colors.white,
  borderRadius: 7,
  border: '1px solid rgba(0,0,0,0.3)',
  boxShadow: '0 2px 10px 0 rgba(0,0,0,0.3)',
  position: 'absolute',
  zIndex: 5,
  bottom: 0,
  marginTop: 15,
  left: '50%',
  minWidth: (props.opts && props.opts.minWidth) || 'auto',
  transform:
    props.opts && props.opts.skewLeft
      ? 'translate(calc(-100% + 22px), calc(100% + 15px))'
      : 'translate(-50%, calc(100% + 15px))',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    display: 'block',
    position: 'absolute',
    left: '50%',
    transform:
      props.opts && props.opts.skewLeft
        ? 'translateX(calc(-100% + 22px))'
        : 'translateX(-50%)',
    height: 13,
    top: -13,
    width: 26,
    backgroundColor: colors.white,
  },
}));
PopoverContainer.displayName = 'Popover:PopoverContainer';

type Props = {
  children: React.ReactNode;
  onDismiss: Function;
  forceOpts?: Opts;
};

export default class Popover extends PureComponent<Props> {
  _ref?: Element | null;

  componentDidMount() {
    window.document.addEventListener('click', this.handleClick);
    window.document.addEventListener('keydown', this.handleKeydown);
  }

  componentWillUnmount() {
    window.document.addEventListener('click', this.handleClick);
    window.document.addEventListener('keydown', this.handleKeydown);
  }

  handleClick = (e: MouseEvent) => {
    if (this._ref && !this._ref.contains(e.target as Node)) {
      this.props.onDismiss();
    }
  };

  handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      this.props.onDismiss();
    }
  };

  _setRef = (ref: Element | null) => {
    this._ref = ref;
  };

  render() {
    return (
      <>
        <Anchor src="./anchor.svg" key="anchor" />
        <PopoverContainer
          ref={this._setRef}
          key="popup"
          opts={this.props.forceOpts || {}}>
          {this.props.children}
        </PopoverContainer>
      </>
    );
  }
}
