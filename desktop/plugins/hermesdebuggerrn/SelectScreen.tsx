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
import {Target, Targets} from './index';

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

const Icon = styled(Glyph)({
  marginRight: 11,
  marginLeft: 6,
});

type Props = {
  readonly targets: Targets;
  readonly onSelect: (target: Target) => void;
};

export default function SelectScreen(props: Props) {
  return (
    <Container>
      <Welcome>
        <Title>Hermes Debugger Select</Title>
        <Item>
          <FlexColumn>
            <ItemTitle>Please select a target:</ItemTitle>
          </FlexColumn>
        </Item>
        {props.targets.map((target) => {
          return (
            <Item onClick={() => props.onSelect(target)}>
              <Icon size={20} name="code" color={colors.info} />
              <FlexColumn>
                <ItemTitle>{target.title}</ItemTitle>
              </FlexColumn>
            </Item>
          );
        })}
      </Welcome>
    </Container>
  );
}
