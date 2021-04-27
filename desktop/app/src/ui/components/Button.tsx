/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useState, useCallback, useMemo} from 'react';
import electron, {MenuItemConstructorOptions} from 'electron';
import styled from '@emotion/styled';
import {keyframes} from '@emotion/css';
import {Button as AntdButton, Dropdown, Menu} from 'antd';

import {colors} from './colors';
import Glyph, {IconSize} from './Glyph';
import type {ButtonProps} from 'antd/lib/button';
import {DownOutlined, CheckOutlined} from '@ant-design/icons';
import {theme} from 'flipper-plugin';

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

type Props = {
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
  type?: ButtonType; // TODO: normalize to Sandy
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
} & Omit<ButtonProps, 'type'>;

/**
 * A simple button, used in many parts of the application.
 * @deprecated use import {Button} from `antd` instead.
 */
export default function Button(props: Props) {
  return <SandyButton {...props} />;
}

/**
 * A simple button, used in many parts of the application.
 */
function SandyButton({
  compact,
  disabled,
  icon,
  children,
  iconSize,
  iconVariant,
  dropdown,
  type,
  onClick,
  href,
  ...restProps
}: Props) {
  const [dropdownVisible, setDropdownVible] = useState(false);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (disabled === true) {
        return;
      }
      onClick?.(e);
      if (href != null) {
        electron.shell.openExternal(href); // TODO: decouple from Electron
      }
    },
    [disabled, onClick, href],
  );
  const handleVisibleChange = useCallback((flag: boolean) => {
    setDropdownVible(flag);
  }, []);
  let iconComponent;
  if (icon != null) {
    iconComponent = (
      <Icon
        name={icon}
        size={iconSize || (compact === true ? 12 : 16)}
        color={theme.textColorPrimary}
        variant={iconVariant || 'filled'}
        hasText={Boolean(children)}
      />
    );
  }

  const dropdownItems = useMemo(
    () =>
      dropdown && (
        <Menu>
          {dropdown!.map((item, idx) => (
            <Menu.Item
              onClick={(e) => {
                // @ts-ignore this event args are bound to electron, remove in the future
                item.click(item);
                if (item.checked !== undefined) {
                  // keep the menu item for check lists
                  e.domEvent.stopPropagation();
                  e.domEvent.preventDefault();
                }
              }}
              disabled={item.enabled === false}
              icon={
                item.checked !== undefined && (
                  <CheckOutlined
                    style={{visibility: item.checked ? 'visible' : 'hidden'}}
                  />
                )
              }
              key={idx}>
              {item.label}
            </Menu.Item>
          ))}
        </Menu>
      ),
    [dropdown],
  );

  const button = (
    <AntdButton
      /* Probably more properties need passing on, but lets be explicit about it */
      style={restProps.style}
      disabled={disabled}
      type={type === 'primary' ? 'primary' : 'default'}
      danger={type === 'danger'}
      onClick={handleClick}
      icon={iconComponent}>
      {children}
      {dropdown ? <DownOutlined /> : null}
    </AntdButton>
  );
  if (dropdown) {
    return (
      <Dropdown
        overlay={dropdownItems!}
        visible={dropdownVisible}
        onVisibleChange={handleVisibleChange}>
        {button}
      </Dropdown>
    );
  } else {
    return button;
  }
}
