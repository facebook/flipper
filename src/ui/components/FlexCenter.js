/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import View from './View.js';
import styled from '../styled/index.js';

/**
 * A container displaying its children horizontally and vertically centered.
 */
export default styled(View)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});
