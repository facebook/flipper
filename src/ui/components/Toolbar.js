/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {StyledComponent} from '../styled/index.js';
import {colors} from './colors.js';
import FlexRow from './FlexRow.js';
import FlexBox from './FlexBox.js';

/**
 * A toolbar.
 */
const Toolbar: StyledComponent<{
  /**
   * Position of the toolbar. Dictates the location of the border.
   */
  position?: 'top' | 'bottom',
  compact?: boolean,
}> = FlexRow.extends(
  {
    backgroundColor: colors.light02,
    borderBottom: props =>
      props.position === 'bottom'
        ? 'none'
        : `1px solid ${colors.sectionHeaderBorder}`,
    borderTop: props =>
      props.position === 'bottom'
        ? `1px solid ${colors.sectionHeaderBorder}`
        : 'none',
    flexShrink: 0,
    height: props => (props.compact ? 28 : 42),
    lineHeight: '32px',
    alignItems: 'center',
    padding: 6,
    width: '100%',
  },
  {
    ignoreAttributes: ['position'],
  },
);

export const Spacer = FlexBox.extends({
  flexGrow: 1,
});

export default Toolbar;
