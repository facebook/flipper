/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import styled from '@emotion/styled';
import FlexColumn from './FlexColumn';

/**
 * Container that applies a standardized bottom margin for vertical spacing
 */
const VBox = styled(FlexColumn)({
  marginBottom: 10,
});
VBox.displayName = 'VBox';

export default VBox;
