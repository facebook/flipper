/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Layout, styled} from 'flipper-plugin';
import {theme} from 'flipper-plugin';

export const CustomDropDown = styled(Layout.Container)({
  backgroundColor: theme.white,
  borderRadius: theme.borderRadius,
  boxShadow: `0 0 4px 1px rgba(0,0,0,0.10)`,
});
