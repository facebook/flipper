/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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
