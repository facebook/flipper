/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import styled from 'react-emotion';
import {colors} from './colors';
import Text from './Text';

/**
 * Subtle text that should not draw attention
 */
const SmallText = styled(Text)(({center}: {center?: boolean}) => ({
  color: colors.light20,
  size: 10,
  fontStyle: 'italic',
  textAlign: center ? 'center' : undefined,
  width: '100%',
}));
SmallText.displayName = 'SmallText';

export default SmallText;
