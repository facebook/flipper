/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {notification} from 'antd';
import {PluginClient} from 'flipper-plugin';
import {Events, Methods} from '../ClientTypes';

export function handleTraversalError(client: PluginClient<Events, Methods>) {
  client.onMessage('traversalError', (event) => {
    notification.warn({
      key: 'client-traversal-error',
      duration: 60,
      message: 'Error fetching UI dump',
      description: `There was an error  UI dump, ${event.errorType} ${event.errorMessage}. We are aware of this and looking into it. Please try again later.`,
    });
    console.error(
      `[ui-debugger] Client error during traversal: `,
      event,
      client.appName,
      client.device.os,
    );
  });
}
