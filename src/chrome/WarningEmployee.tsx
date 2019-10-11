/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {styled, FlexColumn, Text, Button, colors} from 'flipper';

import React from 'react';

const Container = styled(FlexColumn)({
  height: '100%',
  width: '100%',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: colors.light02,
});

const Box = styled(FlexColumn)({
  justifyContent: 'center',
  alignItems: 'center',
  background: colors.white,
  borderRadius: 10,
  boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
  paddingBottom: 16,
});

const Warning = styled(Text)({
  fontSize: 24,
  fontWeight: 300,
  textAlign: 'center',
  margin: 16,
});

const AckButton = styled(Button)({
  type: 'warning',
});

export default function WarningEmployee(props: {
  onClick: (event: React.MouseEvent) => any;
}) {
  return (
    <Container>
      <Box>
        <Warning>
          You are using the open-source version of Flipper. You will get access
          to more plugins. To use the internal version, please install it from
          Managed Software Center
        </Warning>
        <AckButton onClick={props.onClick}>Okay</AckButton>
      </Box>
    </Container>
  );
}
