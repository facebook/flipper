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
import {theme} from 'flipper-plugin';

type Props = {
  value: Size;
};

const SizeInspector: React.FC<Props> = ({value}) => {
  return (
    <>
      <Row
        style={{
          fontSize: theme.fontSize.small,
          paddingLeft: '20%',
          paddingRight: '20%',
        }}>
        <Col span={12} style={{textAlign: 'center'}}>
          width
        </Col>
        <Col span={12} style={{textAlign: 'center'}}>
          height
        </Col>
      </Row>
      <Row style={{paddingLeft: '20%', paddingRight: '20%'}}>
        <Col
          span={12}
          style={{
            textAlign: 'center',
            color: theme.semanticColors.numberValue,
          }}>
          {value.width}
        </Col>
        <Col
          span={12}
          style={{
            textAlign: 'center',
            color: theme.semanticColors.numberValue,
          }}>
          {value.height}
        </Col>
      </Row>
    </>
  );
};

export default SizeInspector;
