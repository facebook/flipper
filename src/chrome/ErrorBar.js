/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {styled, colors} from 'sonar';

const ErrorBarContainer = styled.view({
  backgroundColor: colors.cherry,
  bottom: 0,
  color: '#fff',
  left: 0,
  lineHeight: '26px',
  position: 'absolute',
  right: 0,
  textAlign: 'center',
  zIndex: 2,
});

export default function ErrorBar(props: {|text: ?string|}) {
  if (props.text == null) {
    return null;
  } else {
    return <ErrorBarContainer>{props.text}</ErrorBarContainer>;
  }
}
