/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Col, Row} from 'antd';
import {UINode} from '../../../types';
import {styled} from 'flipper-plugin';
import {CodeInspector} from './fb-stubs/CodeInspector';

type Props = {
  node: UINode;
};

const IdentityContainer = styled.div({
  marginTop: '10px',
});

export const IdentityInspector: React.FC<Props> = ({node}) => {
  return (
    <IdentityContainer>
      <Row gutter={4}>
        <Col span="12">
          <div style={{padding: '0 16px'}}>Name:</div>
        </Col>
        <Col span="12">{node.name}</Col>
      </Row>
      <Row gutter={4}>
        <Col span="12">
          <div style={{padding: '0 16px'}}>Id:</div>
        </Col>
        <Col span="12">{node.id}</Col>
      </Row>
      <CodeInspector name={node.name} tags={node.tags} />
    </IdentityContainer>
  );
};
