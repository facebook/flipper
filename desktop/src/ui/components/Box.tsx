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

const Box = styled(FlexBox)({
  height: '100%',
  overflow: 'auto',
  position: 'relative',
  width: '100%',
});
Box.displayName = 'Box';

export default Box;
