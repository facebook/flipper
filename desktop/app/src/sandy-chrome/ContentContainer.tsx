/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Layout, styled} from '../ui';
import {theme} from './theme';

export const ContentContainer = styled(Layout.Container)({
  flex: 1,
  overflow: 'hidden',
  background: theme.backgroundDefault,
  border: `1px solid ${theme.dividerColor}`,
  borderRadius: theme.containerBorderRadius,
  boxShadow: `0px 0px 5px rgba(0, 0, 0, 0.05), 0px 0px 1px rgba(0, 0, 0, 0.05)`,
});
