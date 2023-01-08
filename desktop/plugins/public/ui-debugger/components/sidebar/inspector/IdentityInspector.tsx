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

const IdentityKey = styled.div({
  padding: '0 16px',
});

const IdentityValue = styled.span({
  fontSize: theme.fontSize.small,
  wordBreak: 'break-all',
});

const IdentityContainer = styled.div(TopSpacedContainerStyle);

export const IdentityInspector: React.FC<Props> = ({node}) => {
  return (
    <IdentityContainer>
      <Row gutter={4}>
        <Col span="10">
          <IdentityKey>Name:</IdentityKey>
        </Col>
        <Col span="14">
          <IdentityValue title={node.name}>{node.name}</IdentityValue>
        </Col>
      </Row>
      <Row gutter={4}>
        <Col span="10">
          <IdentityKey>Qualified name:</IdentityKey>
        </Col>
        <Col span="14">
          <IdentityValue title={node.qualifiedName}>
            {node.qualifiedName}
          </IdentityValue>
        </Col>
      </Row>
      <Row gutter={4}>
        <Col span="10">
          <IdentityKey>Id:</IdentityKey>
        </Col>
        <Col span="14">
          <IdentityValue title={node.id.toString()}>{node.id}</IdentityValue>
        </Col>
      </Row>
      <CodeInspector name={node.qualifiedName} tags={node.tags} />
    </IdentityContainer>
  );
};
