/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import FlexBox from './FlexBox';
import styled from '@emotion/styled';

/**
 * @deprecated use `Layout.Horizontal` from flipper-plugin instead
 * A container displaying its children in a row
 */
const FlexRow = styled(FlexBox)({
  flexDirection: 'row',
});
FlexRow.displayName = 'FlexRow';

export default FlexRow;
