/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {isLoggedIn} from '../../fb-stubs/user';
import {Layout, useValue} from 'flipper-plugin';
import React from 'react';
import config from '../../fb-stubs/config';
import {Alert} from 'antd';
import {LoginOutlined} from '@ant-design/icons';

export const RequireLogin: React.FC<{}> = ({children}) => {
  const loggedIn = useValue(isLoggedIn());
  if (!config.isFBBuild) {
    return (
      <Layout.Container pad>
        <Alert
          type="error"
          message="This feature is only available in the Facebook version of Flipper"
        />
      </Layout.Container>
    );
  }
  if (!loggedIn) {
    return (
      <Layout.Container pad>
        <Alert
          type="error"
          message={
            <>
              You are currently not logged in. Please log in using the{' '}
              <LoginOutlined /> button to use this feature.
            </>
          }
        />
      </Layout.Container>
    );
  }
  return <>{children}</>;
};
