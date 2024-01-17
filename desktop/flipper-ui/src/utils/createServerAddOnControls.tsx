/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  ExecuteMessage,
  FlipperServer,
  ServerAddOnControls,
  deserializeRemoteError,
} from 'flipper-common';

type PluginName = string;
type Method = string;

export const createServerAddOnControls = (
  flipperServer: FlipperServer,
): ServerAddOnControls => {
  const methodHandlers = new Map<
    PluginName,
    Map<Method, (data: unknown) => void>
  >();
  const catchAllHandlers = new Map<
    PluginName,
    (method: string, data: unknown) => void
  >();

  let subscribed = false;
  const subscriptionCb = ({params}: ExecuteMessage) => {
    const pluginName = params.api;

    const methodHandler = methodHandlers.get(pluginName)?.get(params.method);

    if (methodHandler) {
      methodHandler(params.params);
      return;
    }

    const catchAllHandler = catchAllHandlers.get(pluginName);
    catchAllHandler?.(params.method, params.params);
  };

  return {
    start: (pluginName, details, owner) =>
      flipperServer.exec(
        'plugins-server-add-on-start',
        pluginName,
        details,
        owner,
      ),
    stop: (pluginName, owner) =>
      flipperServer.exec('plugins-server-add-on-stop', pluginName, owner),
    sendMessage: async (pluginName, method, params) => {
      const res = await flipperServer.exec(
        'plugins-server-add-on-request-response',
        {
          method: 'execute',
          params: {
            method,
            api: pluginName,
            params,
          },
        },
      );

      if (res.error) {
        throw deserializeRemoteError(res.error);
      }

      return res.success;
    },
    receiveMessage: (pluginName, method, receiver) => {
      if (!methodHandlers.has(pluginName)) {
        methodHandlers.set(pluginName, new Map());
      }
      // TODO: Fix this the next time the file is edited.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      methodHandlers.get(pluginName)!.set(method, receiver);

      // Subscribe client/device to messages from flipper server only when the first plugin subscribes to them
      if (!subscribed) {
        subscribed = true;
        flipperServer.on('plugins-server-add-on-message', subscriptionCb);
      }
    },
    receiveAnyMessage: (pluginName, receiver) => {
      catchAllHandlers.set(pluginName, receiver);
    },
    unsubscribePlugin: (pluginName) => {
      methodHandlers.delete(pluginName);
      catchAllHandlers.delete(pluginName);
    },
    unsubscribe: () => {
      flipperServer.off('plugins-server-add-on-message', subscriptionCb);
    },
  };
};
