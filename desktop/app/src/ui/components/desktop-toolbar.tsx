/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import styled from '@emotion/styled';
import {colors, darkColors} from './colors';
import React from 'react';

const DesktopDropdownContainer = styled.div({
  borderBottom: `1px solid ${darkColors.dividers}`,
  lineHeight: '25px',
  marginTop: 5,
  maxHeight: 600,
  minWidth: 180,
  overflow: 'auto',
  padding: 0,
  paddingBottom: 5,
  textAlign: 'left',
  width: 'auto',

  '&:last-child': {
    borderBottom: 'none',
  },
});
DesktopDropdownContainer.displayName =
  'DesktopDropdown:DesktopDropdownContainer';

export function DesktopDropdown(props: {
  deactivate?: () => void;
  children?: any;
}) {
  return (
    <DesktopDropdownContainer>
      {React.Children.map(props.children, (child) => {
        return (
          child &&
          React.cloneElement(child, {
            deactivate: props.deactivate,
          })
        );
      })}
    </DesktopDropdownContainer>
  );
}

const DesktopDropdownItemContainer = styled.div(
  (props: {onClick?: Function; onHover?: Function}) => ({
    listStyle: 'none',
    opacity: props.onClick || props.onHover ? 1 : 0.5,
    padding: '0 20px',
    '&:hover': {
      backgroundColor: props.onClick || props.onHover ? colors.highlight : '',
      color: props.onClick || props.onHover ? '#fff' : 'inherit',
    },
  }),
);
DesktopDropdownItemContainer.displayName =
  'DesktopDropdownItem:DesktopDropdownItemContainer';

type DesktopDropdownItemState = {hovered: boolean};

type DesktopDropdownItemProps = {
  onClick?: false | ((event: React.MouseEvent) => void);
  onHover?: false | (() => React.ReactNode);
  children?: React.ReactNode;
  deactivate?: () => void;
};

export class DesktopDropdownItem extends React.Component<
  DesktopDropdownItemProps,
  DesktopDropdownItemState
> {
  constructor(props: DesktopDropdownItemProps, context: Object) {
    super(props, context);
    this.state = {hovered: false};
  }

  onMouseEnter = () => {
    this.setState({hovered: true});
  };

  onMouseLeave = () => {
    this.setState({hovered: false});
  };

  onClick = (event: React.MouseEvent) => {
    const {deactivate, onClick} = this.props;
    if (typeof onClick === 'function') {
      if (deactivate) {
        deactivate();
      }
      onClick(event);
    }
  };

  render() {
    const {hovered} = this.state;
    const {
      children,
      deactivate: _deactivate,
      onClick,
      onHover,
      ...props
    } = this.props;

    return (
      <DesktopDropdownItemContainer
        {...props}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        onClick={typeof onClick === 'function' ? this.onClick : undefined}>
        {children}
        {hovered && typeof onHover === 'function' && onHover()}
      </DesktopDropdownItemContainer>
    );
  }
}

export const DesktopDropdownSelectedItem = styled(DesktopDropdownItem)({
  position: 'relative',

  '&::before': {
    content: "'✔'",
    marginLeft: '-15px',
    position: 'absolute',
  },
});
DesktopDropdownSelectedItem.displayName = 'DesktopDropdownSelectedItem';
