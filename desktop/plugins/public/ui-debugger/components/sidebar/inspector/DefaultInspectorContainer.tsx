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
import {styled, theme} from 'flipper-plugin';

type Props = {
  name: string;
};

export const DefaultInputContainer = styled.div({
  margin: 'auto',
  padding: '2px',
  minWidth: '50px',
  backgroundColor: theme.backgroundDefault,
  borderRadius: '5px',
  boxShadow: '0 0 0 1px rgba(0,0,0,.2)',
  display: 'inline-block',
});

export const DefaultInspectorContainer: React.FC<Props> = (props) => {
  return (
    <Row>
      <Col span={8}>{props.name}</Col>
      <Col span={16}>{props.children}</Col>
    </Row>
  );
};
