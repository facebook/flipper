/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import View from './View';
import styled from '@emotion/styled';

type Props = {
  /** Flexbox's shrink property. Set to `0`, to disable shrinking. */
  shrink?: boolean;
};

/**
 * A container using flexbox to layout its children
 */
const FlexBox = styled(View)<Props>(({shrink}) => ({
  display: 'flex',
  flexShrink: shrink == null || shrink ? 1 : 0,
}));
FlexBox.displayName = 'FlexBox';

export default FlexBox;
