/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlexColumn, Button, styled} from 'flipper';

import {ManageMockResponsePanel} from './ManageMockResponsePanel';
import {Route} from './types';
import React from 'react';

type Props = {
  routes: {[id: string]: Route};
  onHide: () => void;
};

const Title = styled('div')({
  fontWeight: 500,
  marginBottom: 10,
  marginTop: 8,
});

const Container = styled(FlexColumn)({
  padding: 10,
  width: 800,
  height: 550,
});

const Row = styled(FlexColumn)({
  alignItems: 'flex-end',
  marginTop: 16,
});

export function MockResponseDialog(props: Props) {
  return (
    <Container>
      <Title>Mock Network Responses</Title>
      <ManageMockResponsePanel routes={props.routes} />
      <Row>
        <Button compact padded onClick={props.onHide}>
          Close
        </Button>
      </Row>
    </Container>
  );
}
