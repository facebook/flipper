/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import PropTypes from 'prop-types';
import electron, {MenuItemConstructorOptions} from 'electron';
import styled from '@emotion/styled';
import {colors} from './colors';
import {connect} from 'react-redux';
import {findDOMNode} from 'react-dom';
import {keyframes} from 'emotion';
import {State as Store} from '../../reducers/index';
import Glyph, {IconSize} from './Glyph';

type ButtonType = 'primary' | 'success' | 'warning' | 'danger';

const borderColor = (props: {
  windowIsFocused?: boolean;
  disabled?: boolean;
  type?: ButtonType;
  depressed?: boolean;
}) => {
  if (!props.windowIsFocused) {
    return colors.macOSTitleBarButtonBorderBlur;
  } else if (props.type === 'danger' && !props.disabled) {
    return colors.red;
  } else if (props.type === 'primary' && !props.disabled) {
    return '#237FF1';
  } else if (props.depressed) {
    return colors.macOSTitleBarButtonBorderBottom;
  } else {
    return colors.macOSTitleBarButtonBorder;
  }
};
const borderBottomColor = (props: {
  windowIsFocused?: boolean;
  disabled?: boolean;
  type?: ButtonType;
  depressed?: boolean;
}) => {
  if (!props.windowIsFocused) {
    return colors.macOSTitleBarButtonBorderBlur;
  } else if (props.type === 'danger' && !props.disabled) {
    return colors.red;
  } else if (props.type === 'primary' && !props.disabled) {
    return '#237FF1';
  } else {
    return colors.macOSTitleBarButtonBorderBottom;
  }
};

const backgroundImage = (props: {
  windowIsFocused?: boolean;
  disabled?: boolean;
  type?: ButtonType;
  depressed?: boolean;
}) => {
  if (props.windowIsFocused && !props.disabled) {
    if (props.depressed) {
      return `linear-gradient(to bottom, ${colors.macOSTitleBarBorderBlur} 1px, ${colors.macOSTitleBarButtonBorderBlur} 0%, ${colors.macOSTitleBarButtonBackgroundActive} 100%)`;
    } else if (props.type === 'primary') {
      return `linear-gradient(to bottom, #67a6f7 0%, #0072FA 100%)`;
    } else {
      return `linear-gradient(to bottom, transparent 0%,${colors.macOSTitleBarButtonBackground} 100%)`;
    }
  } else {
    return 'none';
  }
};

const color = (props: {
  windowIsFocused?: boolean;
  type?: ButtonType;
  disabled?: boolean;
}) => {
  if (props.type === 'danger' && props.windowIsFocused && !props.disabled) {
    return colors.red;
  } else if (
    props.type === 'primary' &&
    props.windowIsFocused &&
    !props.disabled
  ) {
    return colors.white;
  } else if (props.disabled) {
    return colors.macOSTitleBarIconBlur;
  } else {
    return colors.light50;
  }
};

const pulse = keyframes({
  '0%': {
    boxShadow: `0 0 4px 0 ${colors.macOSTitleBarIconSelected}`,
  },
  '70%': {
    boxShadow: '0 0 4px 6px transparent',
  },
  '100%': {
    boxShadow: '0 0 4px 0 transparent',
  },
});

const StyledButton = styled.div<{
  windowIsFocused?: boolean;
  compact?: boolean;
  inButtonGroup?: boolean;
  padded?: boolean;
  pulse?: boolean;
  disabled?: boolean;
  dropdown?: Array<MenuItemConstructorOptions>;
}>((props) => ({
  userSelect: 'none',
  backgroundColor:
    props.windowIsFocused && !props.disabled
      ? colors.white
      : colors.macOSTitleBarButtonBackgroundBlur,
  backgroundImage: backgroundImage(props),
  borderStyle: 'solid',
  borderWidth: 1,
  borderColor: borderColor(props),
  borderBottomColor: borderBottomColor(props),
  color: color(props),
  borderRadius: 4,
  position: 'relative',
  padding: props.padded ? '0 15px' : '0 6px',
  height: props.compact === true ? 24 : 28,
  margin: 0,
  minWidth: 34,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,

  boxShadow:
    props.pulse && props.windowIsFocused
      ? `0 0 0 ${colors.macOSTitleBarIconSelected}`
      : '',
  animation: props.pulse && props.windowIsFocused ? `${pulse} 1s infinite` : '',

  '&:not(:first-child)': {
    marginLeft: props.inButtonGroup === true ? 0 : 10,
    borderTopLeftRadius: props.inButtonGroup === true ? 0 : 4,
    borderBottomLeftRadius: props.inButtonGroup === true ? 0 : 4,
  },

  '&:not(:last-child)': {
    borderTopRightRadius: props.inButtonGroup === true ? 0 : 4,
    borderBottomRightRadius: props.inButtonGroup === true ? 0 : 4,
    borderRight: props.inButtonGroup === true ? 0 : '',
  },

  '&:first-of-type': {
    marginLeft: 0,
  },

  '&:active': props.disabled
    ? null
    : {
        borderColor: colors.macOSTitleBarButtonBorder,
        borderBottomColor: colors.macOSTitleBarButtonBorderBottom,
        background: `linear-gradient(to bottom, ${colors.macOSTitleBarButtonBackgroundActiveHighlight} 1px, ${colors.macOSTitleBarButtonBackgroundActive} 0%, ${colors.macOSTitleBarButtonBorderBlur} 100%)`,
      },

  '&:disabled': {
    borderColor: borderColor(props),
    borderBottomColor: borderBottomColor(props),
    pointerEvents: 'none',
  },

  '&:hover::before': {
    content: props.dropdown ? "''" : 'normal',
    position: 'absolute',
    bottom: 1,
    right: 2,
    borderStyle: 'solid',
    borderWidth: '4px 3px 0 3px',
    borderColor: `${colors.macOSTitleBarIcon} transparent transparent transparent`,
  },
}));
StyledButton.displayName = 'Button:StyledButton';

const Icon = styled(Glyph)<{hasText: boolean}>(({hasText}) => ({
  marginRight: hasText ? 3 : 0,
}));
Icon.displayName = 'Button:Icon';

type OwnProps = {
  /**
   * onMouseUp handler.
   */
  onMouseDown?: (event: React.MouseEvent) => any;
  /**
   * onClick handler.
   */
  onClick?: (event: React.MouseEvent) => any;
  /**
   * Whether this button is disabled.
   */
  disabled?: boolean;
  /**
   * Whether this button is large. Increases padding and line-height.
   */
  large?: boolean;
  /**
   * Whether this button is compact. Decreases padding and line-height.
   */
  compact?: boolean;
  /**
   * Type of button.
   */
  type?: ButtonType;
  /**
   * Children.
   */
  children?: React.ReactNode;
  /**
   * Dropdown menu template shown on click.
   */
  dropdown?: Array<MenuItemConstructorOptions>;
  /**
   * Name of the icon dispalyed next to the text
   */
  icon?: string;
  /**
   * Size of the icon in pixels.
   */
  iconSize?: IconSize;
  /**
   * For toggle buttons, if the button is selected
   */
  selected?: boolean;
  /**
   * Button is pulsing
   */
  pulse?: boolean;
  /**
   * URL to open in the browser on click
   */
  href?: string;
  /**
   * Whether the button should render depressed into its socket
   */
  depressed?: boolean;
  /**
   * Style of the icon. `filled` is the default
   */
  iconVariant?: 'filled' | 'outline';
  /**
   * Whether the button should have additional padding left and right.
   */
  padded?: boolean;
} & React.HTMLProps<HTMLDivElement>;

type State = {
  active: boolean;
  wasClosed: boolean;
};

type StateFromProps = {windowIsFocused: boolean};
type Props = OwnProps & StateFromProps;

/**
 * A simple button, used in many parts of the application.
 */
class Button extends React.Component<Props, State> {
  static contextTypes = {
    inButtonGroup: PropTypes.bool,
  };

  state = {
    active: false,
    wasClosed: false,
  };

  _ref = React.createRef<React.Component<typeof StyledButton>>();

  onMouseDown = (e: React.MouseEvent) => {
    this.setState({active: true, wasClosed: false});
    if (this.props.onMouseDown != null) {
      this.props.onMouseDown(e);
    }
  };
  onMouseUp = () => {
    if (this.props.disabled === true) {
      return;
    }
    if (this.props.dropdown && !this.state.wasClosed) {
      const menu = electron.remote.Menu.buildFromTemplate(this.props.dropdown);
      const position: {
        x?: number;
        y?: number;
      } = {};
      const {current} = this._ref;
      if (current) {
        const node = findDOMNode(current);
        if (node instanceof Element) {
          const {left, bottom} = node.getBoundingClientRect();
          position.x = Math.floor(left);
          position.y = Math.floor(bottom) + 6;
        }
      }
      menu.popup({
        window: electron.remote.getCurrentWindow(),
        // @ts-ignore: async is private API in electron
        async: true,
        ...position,
        callback: () => {
          this.setState({wasClosed: true});
        },
      });
    }
    this.setState({active: false, wasClosed: false});
  };

  onClick = (e: React.MouseEvent) => {
    if (this.props.disabled === true) {
      return;
    }
    if (this.props.onClick) {
      this.props.onClick(e);
    }
    if (this.props.href != null) {
      electron.shell.openExternal(this.props.href);
    }
  };

  render() {
    const {
      icon,
      children,
      selected,
      iconSize,
      windowIsFocused,
      iconVariant,
      ...props
    } = this.props;
    const {active} = this.state;

    let color = colors.macOSTitleBarIcon;
    if (props.disabled === true) {
      color = colors.macOSTitleBarIconBlur;
    } else if (windowIsFocused && selected === true) {
      color = colors.macOSTitleBarIconSelected;
    } else if (!windowIsFocused && (selected == null || selected === false)) {
      color = colors.macOSTitleBarIconBlur;
    } else if (!windowIsFocused && selected === true) {
      color = colors.macOSTitleBarIconSelectedBlur;
    } else if (selected == null && active) {
      color = colors.macOSTitleBarIconActive;
    } else if (props.type === 'danger') {
      color = colors.red;
    }

    let iconComponent;
    if (icon != null) {
      iconComponent = (
        <Icon
          name={icon}
          size={iconSize || (this.props.compact === true ? 12 : 16)}
          color={color}
          variant={iconVariant || 'filled'}
          hasText={Boolean(children)}
        />
      );
    }

    return (
      <StyledButton
        {...props}
        ref={this._ref as any}
        windowIsFocused={windowIsFocused}
        onClick={this.onClick}
        onMouseDown={this.onMouseDown}
        onMouseUp={this.onMouseUp}
        inButtonGroup={this.context.inButtonGroup}>
        {iconComponent}
        {children}
      </StyledButton>
    );
  }
}

export default connect<StateFromProps, {}, OwnProps, Store>(
  ({application: {windowIsFocused}}) => ({
    windowIsFocused,
  }),
)(Button);
