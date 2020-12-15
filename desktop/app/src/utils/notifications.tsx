/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {notification, Typography} from 'antd';
import React from 'react';
import {ConsoleLogs} from '../chrome/ConsoleLogs';
import {setStaticView} from '../reducers/connections';
import {store} from '../store';

const {Text, Link} = Typography;

export function showErrorNotification(message: string) {
  notification.error({
    message,
    description: (
      <Text>
        See{' '}
        <Link onClick={() => store.dispatch(setStaticView(ConsoleLogs))}>
          logs
        </Link>{' '}
        for details.
      </Text>
    ),
    placement: 'bottomLeft',
  });
}
