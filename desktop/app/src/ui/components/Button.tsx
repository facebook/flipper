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
import {Button as AntdButton, Dropdown, Menu} from 'antd';

import Glyph, {IconSize} from './Glyph';
import type {ButtonProps} from 'antd/lib/button';
import {DownOutlined, CheckOutlined} from '@ant-design/icons';
import {theme} from 'flipper-plugin';

type ButtonType = 'primary' | 'success' | 'warning' | 'danger';

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
