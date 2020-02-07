/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import styled from '@emotion/styled';
import {colors} from './colors';

/**
 * Puts a gray border around something
 */
const Bordered = styled.div({
  borderRadius: 4,
  overflow: 'hidden',
  border: `1px solid ${colors.macOSTitleBarButtonBorder}`,
  backgroundColor: colors.white,
  display: 'flex',
});
Bordered.displayName = 'bordered';

export default Bordered;
