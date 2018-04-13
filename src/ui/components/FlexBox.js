/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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
