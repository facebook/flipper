/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import styled from 'react-emotion';
import FlexColumn from './FlexColumn';

/**
 * Container that applies a standardized bottom margin for vertical spacing
 */
const BottomSpaced = styled(FlexColumn)({
  marginBottom: 10,
});
BottomSpaced.displayName = 'BottomSpaced';

export default BottomSpaced;
