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
 * @deprecated use `Layout.Container` from flipper-plugin instead
 * A container displaying its children in a column
 */
const FlexColumn = styled(FlexBox)({
  flexDirection: 'column',
});
FlexColumn.displayName = 'FlexColumn';

export default FlexColumn;
