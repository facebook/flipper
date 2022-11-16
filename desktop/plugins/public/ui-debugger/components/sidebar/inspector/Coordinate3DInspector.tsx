/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Coordinate3D} from '../../../types';
import {Col, Row} from 'antd';
import {
  CenteredContentStyle,
  CenteredHeadingContentStyle,
  CenteredNumberStyle,
  CenteredTextStyle,
} from './Styles';

type Props = {
  value: Coordinate3D;
};

const Coordinate3DInspector: React.FC<Props> = ({value}) => {
  return (
    <>
      <Row style={CenteredHeadingContentStyle}>
        <Col span={8} style={CenteredTextStyle}>
          x
        </Col>
        <Col span={8} style={CenteredTextStyle}>
          y
        </Col>
        <Col span={8} style={CenteredTextStyle}>
          z
        </Col>
      </Row>
      <Row style={CenteredContentStyle}>
        <Col span={8} style={CenteredNumberStyle}>
          {value.x}
        </Col>
        <Col span={8} style={CenteredNumberStyle}>
          {value.y}
        </Col>
        <Col span={8} style={CenteredNumberStyle}>
          {value.z}
        </Col>
      </Row>
    </>
  );
};

export default Coordinate3DInspector;
