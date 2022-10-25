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
import {theme} from 'flipper-plugin';

type Props = {
  value: Coordinate3D;
};

const Coordinate3DInspector: React.FC<Props> = ({value}) => {
  return (
    <>
      <Row
        style={{
          fontSize: theme.fontSize.small,
          paddingLeft: '20%',
          paddingRight: '20%',
        }}>
        <Col span={8} style={{textAlign: 'center'}}>
          x
        </Col>
        <Col span={8} style={{textAlign: 'center'}}>
          y
        </Col>
        <Col span={8} style={{textAlign: 'center'}}>
          z
        </Col>
      </Row>
      <Row style={{paddingLeft: '20%', paddingRight: '20%'}}>
        <Col
          span={8}
          style={{
            textAlign: 'center',
            color: theme.semanticColors.numberValue,
          }}>
          {value.x}
        </Col>
        <Col
          span={8}
          style={{
            textAlign: 'center',
            color: theme.semanticColors.numberValue,
          }}>
          {value.y}
        </Col>
        <Col
          span={8}
          style={{
            textAlign: 'center',
            color: theme.semanticColors.numberValue,
          }}>
          {value.z}
        </Col>
      </Row>
    </>
  );
};

export default Coordinate3DInspector;
