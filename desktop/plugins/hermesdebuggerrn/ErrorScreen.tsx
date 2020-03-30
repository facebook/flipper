/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {styled, FlexColumn, FlexRow, Text, Glyph, colors} from 'flipper';

const Container = styled(FlexColumn)({
  height: '100%',
  width: '100%',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: colors.light02,
});

const Welcome = styled(FlexColumn)({
  width: 460,
  background: colors.white,
  borderRadius: 10,
  boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
  overflow: 'hidden',
  transition: '0.6s all ease-out',
});

const Title = styled(Text)({
  fontSize: 24,
  fontWeight: 300,
  textAlign: 'center',
  color: colors.light50,
  marginTop: 16,
  marginBottom: 16,
});

const Item = styled(FlexRow)({
  padding: 10,
  alignItems: 'center',
  borderTop: `1px solid ${colors.light10}`,
});

const ItemTitle = styled(Text)({
  color: colors.light50,
  fontSize: 14,
  lineHeight: '20px',
});

const Bold = styled(Text)({
  fontWeight: 600,
});

const Icon = styled(Glyph)({
  marginRight: 11,
  marginLeft: 6,
});

// As more known failures are found, add them to this list with better error information.
const KNOWN_FAILURE_MESSAGES: Record<
  string,
  Record<'message' | 'hint', string>
> = {
  'Failed to fetch': {
    // This is the error that is returned specifcally when Metro is turned off.
    message: 'Metro disconnected.',
    hint: 'Please check that metro is running and Flipper can connect to it.',
  },
  default: {
    // All we really know in this case is that we can't connect to metro.
    // Do not try and be more specific here.
    message: 'Cannot connect to Metro.',
    hint: 'Please check that metro is running and Flipper can connect to it.',
  },
};

function getReason(error: Error) {
  let failure_message = KNOWN_FAILURE_MESSAGES.default;
  if (error != null && KNOWN_FAILURE_MESSAGES[error.message]) {
    failure_message = KNOWN_FAILURE_MESSAGES[error.message];
  }

  return (
    <ItemTitle>
      <Bold>{failure_message.message} </Bold>
      {failure_message.hint}
    </ItemTitle>
  );
}

type Props = Readonly<{
  error: Error;
}>;

export default function ErrorScreen(props: Props) {
  return (
    <Container>
      <Welcome>
        <Title>Hermes Debugger Error</Title>
        <Item>
          <Icon size={20} name="caution-octagon" color={colors.red} />
          <FlexColumn>{getReason(props.error)}</FlexColumn>
        </Item>
      </Welcome>
    </Container>
  );
}
