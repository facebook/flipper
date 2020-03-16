/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import View from './View';
import styled from '@emotion/styled';

/**
 * A container displaying its children horizontally and vertically centered.
 */
const FlexCenter = styled(View)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});
FlexCenter.displayName = 'FlexCenter';

export default FlexCenter;
