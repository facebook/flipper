/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Layout, styled} from '../ui';

export const CenteredContainer = styled(Layout.Container)({
  width: '100%',
  height: '100%',
  flexGrow: 1,
  alignItems: 'center',
  justifyContent: 'center',
});
