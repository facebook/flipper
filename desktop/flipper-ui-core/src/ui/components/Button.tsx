/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useCallback} from 'react';
import styled from '@emotion/styled';
import {Button as AntdButton} from 'antd';

import Glyph, {IconSize} from './Glyph';
import type {ButtonProps} from 'antd/lib/button';
import {theme, getFlipperLib} from 'flipper-plugin';

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
  type,
  onClick,
  href,
  ...restProps
}: Props) {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (disabled === true) {
        return;
      }
      onClick?.(e);
      if (href != null) {
        getFlipperLib().openLink(href);
      }
    },
    [disabled, onClick, href],
  );
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

  return (
    <AntdButton
      /* Probably more properties need passing on, but lets be explicit about it */
      style={restProps.style}
      disabled={disabled}
      type={type === 'primary' ? 'primary' : 'default'}
      danger={type === 'danger'}
      onClick={handleClick}
      icon={iconComponent}>
      {children}
    </AntdButton>
  );
}
