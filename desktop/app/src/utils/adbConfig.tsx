/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {parseEnvironmentVariableAsNumber} from './environmentVariables';

export default () => {
  let port = parseEnvironmentVariableAsNumber(
    'ANDROID_ADB_SERVER_PORT',
    5037,
  ) as number;

  let host = 'localhost';

  const socket = (process.env.ADB_SERVER_SOCKET || '').trim();
  if (socket && socket.length > 0) {
    const match = socket.match(/^(tcp:)(\S+):(\d+)/);
    if (match && match.length === 4) {
      host = match[2];
      port = parseInt(match[3], 10);
    }
  }

  return {
    port,
    host,
  };
};
