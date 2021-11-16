/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import styled from '@emotion/styled';
import React from 'react';

const LargeHeading = styled.div({
  fontSize: 18,
  fontWeight: 'bold',
  lineHeight: '20px',
  borderBottom: '1px solid #ddd',
  marginBottom: 10,
});
LargeHeading.displayName = 'Heading:LargeHeading';

const SmallHeading = styled.div({
  fontSize: 12,
  color: '#90949c',
  fontWeight: 'bold',
  marginBottom: 10,
  textTransform: 'uppercase',
});
SmallHeading.displayName = 'Heading:SmallHeading';

/**
 * A heading component.
 */
export default function Heading(props: {
  /**
   * Level of the heading. A number from 1-6. Where 1 is the largest heading.
   */
  level?: number;
  /**
   * Children.
   */
  children?: React.ReactNode;
}) {
  if (props.level === 1) {
    return <LargeHeading>{props.children}</LargeHeading>;
  } else {
    return <SmallHeading>{props.children}</SmallHeading>;
  }
}
