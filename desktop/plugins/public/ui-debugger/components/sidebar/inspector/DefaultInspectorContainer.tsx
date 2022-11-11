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
import {styled} from 'flipper-plugin';
import {DefaultInputContainerStyle} from './Styles';

type Props = {
  name: string;
};

export const DefaultInputContainer = styled.div(DefaultInputContainerStyle);

export const DefaultInspectorContainer: React.FC<Props> = (props) => {
  return (
    <Row>
      <Col span={8}>{props.name}</Col>
      <Col span={16}>{props.children}</Col>
    </Row>
  );
};
