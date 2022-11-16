/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Coordinate} from '../../../types';
import {Col, Row} from 'antd';
import {
  CenteredContentStyle,
  CenteredHeadingContentStyle,
  CenteredNumberStyle,
  CenteredTextStyle,
} from './Styles';

type Props = {
  value: Coordinate;
};

const CoordinateInspector: React.FC<Props> = ({value}) => {
  return (
    <>
      <Row style={CenteredHeadingContentStyle}>
        <Col span={12} style={CenteredTextStyle}>
          x
        </Col>
        <Col span={12} style={CenteredTextStyle}>
          y
        </Col>
      </Row>
      <Row style={CenteredContentStyle}>
        <Col span={12} style={CenteredNumberStyle}>
          {value.x}
        </Col>
        <Col span={12} style={CenteredNumberStyle}>
          {value.y}
        </Col>
      </Row>
    </>
  );
};

export default CoordinateInspector;
