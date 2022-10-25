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

type Props = {
  node: UINode;
};

export const IdentityInspector: React.FC<Props> = ({node}) => {
  return (
    <>
      <Row gutter={4} style={{marginTop: '10px'}}>
        <Col flex="100px">
          <div style={{padding: '0 16px'}}>Name:</div>
        </Col>
        <Col flex="auto">{node.name}</Col>
      </Row>
      <Row gutter={4}>
        <Col flex="100px">
          <div style={{padding: '0 16px'}}>Id:</div>
        </Col>
        <Col flex="auto">{node.id}</Col>
      </Row>
    </>
  );
};
