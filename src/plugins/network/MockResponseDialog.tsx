/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import {Component, FlexColumn, Button, styled} from 'flipper';

import {ManageMockResponsePanel} from './ManageMockResponsePanel';
import {Route, RequestId} from './types';
import React from 'react';

type Props = {
  routes: Map<RequestId, Route>;
  onHide: () => void;
  onDismiss: () => void;
  handleRoutesChange: (routes: Map<RequestId, Route>) => void;
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

export class MockResponseDialog extends Component<Props> {
  onCloseButtonClicked = () => {
    this.props.onHide();
    this.props.onDismiss();
  };

  render() {
    return (
      <Container>
        <Title>Mock Network Responses</Title>
        <ManageMockResponsePanel
          routes={this.props.routes}
          handleRoutesChange={this.props.handleRoutesChange}
        />
        <Row>
          <Button compact padded onClick={this.onCloseButtonClicked}>
            Close
          </Button>
        </Row>
      </Container>
    );
  }
}
