/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import FlexBox from './FlexBox';
import styled from '@emotion/styled';

/**
 * Deprecated, set 'gap' on the parent container instead
 */
export const Spacer = styled(FlexBox)({
  flexGrow: 1,
});
Spacer.displayName = 'Spacer';
