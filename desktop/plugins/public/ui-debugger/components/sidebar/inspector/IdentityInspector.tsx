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
import {styled, theme} from 'flipper-plugin';
import {CodeInspector} from './fb-stubs/CodeInspector';
import {TopSpacedContainerStyle} from './Styles';

type Props = {
  node: UINode;
};

const IdentityContainer = styled.div(TopSpacedContainerStyle);

export const IdentityInspector: React.FC<Props> = ({node}) => {
  return (
    <IdentityContainer>
      <Row gutter={4}>
        <Col span="10">
          <div style={{padding: '0 16px'}}>Name:</div>
        </Col>
        <Col span="14" style={{fontSize: theme.fontSize.small}}>
          {node.name}
        </Col>
      </Row>
      <Row gutter={4}>
        <Col span="10">
          <div style={{padding: '0 16px'}}>Qualified name:</div>
        </Col>
        <Col span="14" style={{fontSize: theme.fontSize.small}}>
          {node.qualifiedName}
        </Col>
      </Row>
      <Row gutter={4}>
        <Col span="10">
          <div style={{padding: '0 16px'}}>Id:</div>
        </Col>
        <Col span="14" style={{fontSize: theme.fontSize.small}}>
          {node.id}
        </Col>
      </Row>
      <CodeInspector name={node.qualifiedName} tags={node.tags} />
    </IdentityContainer>
  );
};
