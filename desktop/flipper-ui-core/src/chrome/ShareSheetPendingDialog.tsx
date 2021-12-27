/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Button, Typography} from 'antd';
import {Layout, Spinner} from 'flipper-plugin';
import React from 'react';

const {Text} = Typography;

export default function (props: {
  statusMessage: string;
  statusUpdate: string | null;
  hideNavButtons?: boolean;
  onCancel?: () => void;
  width?: number;
}) {
  return (
    <Layout.Container style={{width: props.width, textAlign: 'center'}}>
      <Spinner size={30} />
      {props.statusUpdate && props.statusUpdate.length > 0 ? (
        <Text strong>{props.statusUpdate}</Text>
      ) : (
        <Text strong>{props.statusMessage}</Text>
      )}
      {!props.hideNavButtons && props.onCancel && (
        <Layout.Right>
          <div />
          <Button
            onClick={() => {
              props.onCancel && props.onCancel();
            }}>
            Cancel
          </Button>
        </Layout.Right>
      )}
    </Layout.Container>
  );
}
