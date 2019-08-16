/**
 * Copyright 2019-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {colors, styled} from 'flipper';
import type {Element} from 'react';

type Props = {
  statusColor: string,
  diameter?: number | string,
  title?: string,
};

const StatusIndicator: Props => Element<'div'> = styled('div')(
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

export default StatusIndicator;
