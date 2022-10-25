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
import {theme} from 'flipper-plugin';

type Props = {
  value: Coordinate;
};

const CoordinateInspector: React.FC<Props> = ({value}) => {
  return (
    <>
      <Row
        style={{
          fontSize: theme.fontSize.small,
          paddingLeft: '20%',
          paddingRight: '20%',
        }}>
        <Col span={12} style={{textAlign: 'center'}}>
          x
        </Col>
        <Col span={12} style={{textAlign: 'center'}}>
          y
        </Col>
      </Row>
      <Row style={{paddingLeft: '20%', paddingRight: '20%'}}>
        <Col
          span={12}
          style={{
            textAlign: 'center',
            color: theme.semanticColors.numberValue,
          }}>
          {value.x}
        </Col>
        <Col
          span={12}
          style={{
            textAlign: 'center',
            color: theme.semanticColors.numberValue,
          }}>
          {value.y}
        </Col>
      </Row>
    </>
  );
};

export default CoordinateInspector;
