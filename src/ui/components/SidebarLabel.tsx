/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {colors} from './colors';
import Label from './Label';
import styled from '@emotion/styled';

const SidebarLabel = styled(Label)({
  color: colors.blackAlpha30,
  fontSize: 12,
  padding: 10,
});
SidebarLabel.displayName = 'SidebarLabel';

export default SidebarLabel;
