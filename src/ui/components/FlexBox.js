/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import View from './View.js';

export default View.extends(
  {
    display: 'flex',
    flexShrink: props => (props.shrink == null || props.shrink ? 1 : 0),
  },
  {
    ignoreAttributes: ['shrink'],
  },
);
