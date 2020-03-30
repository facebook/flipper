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

export default function LaunchScreen() {
  return (
    <Container>
      <Welcome>
        <Title>Hermes Debugger</Title>
        <Item>
          <Icon size={20} name="question-circle" color={colors.info} />
          <FlexColumn>
            <ItemTitle>
              <Bold>Metro is connected but no Hermes apps were found.</Bold>{' '}
              Open a React Native screen with Hermes enabled to connect. Note:
              you may need to reload the app in order to reconnect the device to
              Metro.
            </ItemTitle>
          </FlexColumn>
        </Item>
      </Welcome>
    </Container>
  );
}
