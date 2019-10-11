/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {colors, styled} from 'flipper';
import {BackgroundColorProperty, HeightProperty} from 'csstype';

type Props = {
  statusColor: BackgroundColorProperty;
  diameter?: HeightProperty<number>;
  title?: string;
};

const StatusIndicator = styled('div')(
  ({statusColor, diameter = 10, title}: Props) => ({
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
