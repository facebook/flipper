/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Button, styled, Layout, Spacer} from 'flipper';

import {ManageMockResponsePanel} from './ManageMockResponsePanel';
import {Route, Requests} from './types';
import React from 'react';

import {NetworkRouteContext} from './index';
import {useContext} from 'react';

type Props = {
  routes: {[id: string]: Route};
  onHide: () => void;
  highlightedRows: Set<string> | null | undefined;
  requests: Requests;
};

const Title = styled('div')({
  fontWeight: 500,
  marginBottom: 10,
  marginTop: 8,
});

const StyledContainer = styled(Layout.Container)({
  padding: 10,
  width: 1200,
});

export function MockResponseDialog(props: Props) {
  const networkRouteManager = useContext(NetworkRouteContext);
  return (
    <StyledContainer pad gap width={1200}>
      <Title>Mock Network Responses</Title>
      <Layout.Container>
        <ManageMockResponsePanel
          routes={props.routes}
          highlightedRows={props.highlightedRows}
          requests={props.requests}
        />
      </Layout.Container>
      <Layout.Horizontal gap>
        <Button
          compact
          padded
          onClick={() => {
            networkRouteManager.importRoutes();
          }}>
          Import
        </Button>
        <Button
          compact
          padded
          onClick={() => {
            networkRouteManager.exportRoutes();
          }}>
          Export
        </Button>
        <Button
          compact
          padded
          onClick={() => {
            networkRouteManager.clearRoutes();
          }}>
          Clear
        </Button>
        <Spacer />
        <Button compact padded onClick={props.onHide}>
          Close
        </Button>
      </Layout.Horizontal>
    </StyledContainer>
  );
}
