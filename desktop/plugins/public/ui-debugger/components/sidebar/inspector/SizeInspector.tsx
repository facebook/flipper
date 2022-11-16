/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {Size} from '../../../types';
import {Col, Row} from 'antd';
import {
  CenteredContentStyle,
  CenteredHeadingContentStyle,
  CenteredNumberStyle,
  CenteredTextStyle,
} from './Styles';

type Props = {
  value: Size;
};

const SizeInspector: React.FC<Props> = ({value}) => {
  return (
    <>
      <Row style={CenteredHeadingContentStyle}>
        <Col span={12} style={CenteredTextStyle}>
          width
        </Col>
        <Col span={12} style={CenteredTextStyle}>
          height
        </Col>
      </Row>
      <Row style={CenteredContentStyle}>
        <Col span={12} style={CenteredNumberStyle}>
          {value.width}
        </Col>
        <Col span={12} style={CenteredNumberStyle}>
          {value.height}
        </Col>
      </Row>
    </>
  );
};

export default SizeInspector;
