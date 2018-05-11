/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import styled from '../styled/index.js';
import {colors} from './colors.js';

export default styled.view(
  {
    backgroundColor: ({active, windowFocused}) => {
      if (active && windowFocused) {
        return colors.macOSTitleBarIconSelected;
      } else if (active && !windowFocused) {
        return colors.macOSTitleBarBorderBlur;
      } else {
        return 'none';
      }
    },
    color: ({active, windowFocused}) =>
      active && windowFocused ? colors.white : colors.macOSSidebarSectionItem,
    lineHeight: '25px',
    padding: '0 10px',
    '&[disabled]': {
      color: 'rgba(0, 0, 0, 0.5)',
    },
  },
  {
    ignoreAttributes: ['active', 'windowFocused'],
  },
);
