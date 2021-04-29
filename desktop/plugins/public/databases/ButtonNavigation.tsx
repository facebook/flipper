/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Radio} from 'antd';
import React from 'react';
import {LeftOutlined, RightOutlined} from '@ant-design/icons';

export default React.memo(
  (props: {
    /** Back button is enabled */
    canGoBack: boolean;
    /** Forwards button is enabled */
    canGoForward: boolean;
    /** Callback when back button is clicked */
    onBack: () => void;
    /** Callback when forwards button is clicked */
    onForward: () => void;
  }) => {
    return (
      <Radio.Group style={{marginLeft: 5, marginRight: 5}}>
        <Radio.Button disabled={!props.canGoBack} onClick={props.onBack}>
          <LeftOutlined size={16} />
        </Radio.Button>
        <Radio.Button disabled={!props.canGoForward} onClick={props.onForward}>
          <RightOutlined size={16} />
        </Radio.Button>
      </Radio.Group>
    );
  },
);
