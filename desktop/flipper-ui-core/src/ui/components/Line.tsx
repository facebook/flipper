/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import styled from '@emotion/styled';
import View from './View';
import {colors} from './colors';

const Line = styled(View)<{color?: string}>(({color}) => ({
  backgroundColor: color ? color : colors.grayTint2,
  height: 1,
  width: 'auto',
  flexShrink: 0,
}));
export default Line;
