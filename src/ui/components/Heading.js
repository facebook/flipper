/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import styled from '../styled/index.js';

const LargeHeading = styled.view({
  fontSize: 18,
  fontWeight: 'bold',
  lineHeight: '20px',
  borderBottom: '1px solid #ddd',
  marginBottom: 10,
});

const SmallHeading = styled.view({
  fontSize: 12,
  color: '#90949c',
  fontWeight: 'bold',
  marginBottom: 10,
  textTransform: 'uppercase',
});

/**
 * A heading component.
 *
 * @example Heading 1
 *   <Heading level={1}>I'm a heading</Heading>
 * @example Heading 2
 *   <Heading level={2}>I'm a heading</Heading>
 * @example Heading 3
 *   <Heading level={3}>I'm a heading</Heading>
 * @example Heading 4
 *   <Heading level={4}>I'm a heading</Heading>
 * @example Heading 5
 *   <Heading level={5}>I'm a heading</Heading>
 * @example Heading 6
 *   <Heading level={6}>I'm a heading</Heading>
 */
export default function Heading(props: {
  /**
   * Level of the heading. A number from 1-6. Where 1 is the largest heading.
   */
  level?: number,
  /**
   * Children.
   */
  children?: React$Node,
}) {
  if (props.level === 1) {
    return <LargeHeading>{props.children}</LargeHeading>;
  } else {
    return <SmallHeading>{props.children}</SmallHeading>;
  }
}
