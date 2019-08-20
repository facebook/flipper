/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {colors} from './colors';
import FlexRow from './FlexRow';
import FlexBox from './FlexBox';
import styled from 'react-emotion';

/**
 * A toolbar.
 */
const Toolbar = styled(FlexRow)(
  (props: {position?: 'bottom' | 'top'; compact?: boolean}) => ({
    backgroundColor: colors.light02,
    borderBottom:
      props.position === 'bottom'
        ? 'none'
        : `1px solid ${colors.sectionHeaderBorder}`,
    borderTop:
      props.position === 'bottom'
        ? `1px solid ${colors.sectionHeaderBorder}`
        : 'none',
    flexShrink: 0,
    height: props.compact ? 28 : 42,
    lineHeight: '32px',
    alignItems: 'center',
    padding: 6,
    width: '100%',
  }),
);

export const Spacer = styled(FlexBox)({
  flexGrow: 1,
});

export default Toolbar;
