/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import View from './View.js';
import styled from '../styled/index.js';

type Props = {
  /** Flexbox's shrink property. Set to `0`, to disable shrinking. */
  shrink: number,
};

/**
 * A container using flexbox to layout its children
 */
export default styled(View)(({shrink}: Props) => ({
  display: 'flex',
  flexShrink: shrink == null || shrink ? 1 : 0,
}));
