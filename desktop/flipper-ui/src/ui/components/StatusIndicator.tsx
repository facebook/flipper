/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import styled from '@emotion/styled';
import {colors} from './colors';

import {Property} from 'csstype';

type Props = {
  statusColor: Property.BackgroundColor;
  diameter?: Property.Height<number>;
  title?: string;
};

const StatusIndicator = styled.div<Props>(
  ({statusColor, diameter = 10, title}) => ({
    alignSelf: 'center',
    backgroundColor: statusColor,
    border: `1px solid ${colors.blackAlpha30}`,
    borderRadius: '50%',
    display: 'inline-block',
    flexShrink: 0,
    height: diameter,
    title,
    width: diameter,
  }),
);
StatusIndicator.displayName = 'StatusIndicator';

export default StatusIndicator;
