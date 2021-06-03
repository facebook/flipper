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
import {Layout} from '../ui';
import {v4 as uuid} from 'uuid';

const {Link} = Typography;

export function showErrorNotification(message: string, description?: string) {
  const key = uuid();
  notification.error({
    key,
    message,
    description: (
      <Layout.Container gap>
        {description ?? <p>{description}</p>}
        <p>
          See{' '}
          <Link
            onClick={() => {
              store.dispatch(setStaticView(ConsoleLogs));
              notification.close(key);
            }}>
            logs
          </Link>{' '}
          for details.
        </p>
      </Layout.Container>
    ),
    placement: 'bottomLeft',
  });
}
