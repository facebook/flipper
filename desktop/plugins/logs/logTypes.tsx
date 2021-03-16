/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {theme} from 'flipper-plugin';
import {WarningFilled, CloseCircleFilled} from '@ant-design/icons';
import React, {CSSProperties} from 'react';

const iconStyle = {
  fontSize: '16px',
};

export const baseRowStyle = {
  ...theme.monospace,
};

export const logTypes: {
  [level: string]: {
    label: string;
    icon?: React.ReactNode;
    style?: CSSProperties;
    enabled: boolean;
  };
} = {
  verbose: {
    label: 'Verbose',
    style: {
      ...baseRowStyle,
      color: theme.textColorSecondary,
    },
    enabled: false,
  },
  debug: {
    label: 'Debug',
    style: {
      ...baseRowStyle,
      color: theme.textColorSecondary,
    },
    enabled: false,
  },
  info: {
    label: 'Info',
    enabled: true,
  },
  warn: {
    label: 'Warn',
    style: {
      ...baseRowStyle,
      color: theme.warningColor,
    },
    icon: <WarningFilled style={iconStyle} />,
    enabled: true,
  },
  error: {
    label: 'Error',
    style: {
      ...baseRowStyle,
      color: theme.errorColor,
    },
    icon: <CloseCircleFilled style={iconStyle} />,
    enabled: true,
  },
  fatal: {
    label: 'Fatal',
    style: {
      ...baseRowStyle,
      background: theme.errorColor,
      color: theme.white,
    },
    icon: <CloseCircleFilled style={iconStyle} />,
    enabled: true,
  },
};
