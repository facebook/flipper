/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {useEffect} from 'react';
import LegacyApp from './LegacyApp';
import fbConfig from '../fb-stubs/config';
import {isFBEmployee} from '../utils/fbEmployee';
import {Logger} from '../fb-interfaces/Logger';
import isSandyEnabled from '../utils/isSandyEnabled';
import {SandyApp} from '../sandy-chrome/SandyApp';
import {notification} from 'antd';
import isProduction from '../utils/isProduction';

type Props = {logger: Logger};

export default function App(props: Props) {
  useEffect(() => {
    if (fbConfig.warnFBEmployees && isProduction()) {
      isFBEmployee().then((isEmployee) => {
        if (isEmployee) {
          notification.warning({
            placement: 'bottomLeft',
            message: 'Please use Flipper@FB',
            description: (
              <>
                You are using the open-source version of Flipper. Install the
                internal build from Managed Software Center to get access to
                more plugins.
              </>
            ),
            duration: null,
          });
        }
      });
    }
  }, []);
  return isSandyEnabled() ? <SandyApp /> : <LegacyApp logger={props.logger} />;
}
