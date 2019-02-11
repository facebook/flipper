/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

export default () => {
  let port = parseInt(process.env.ANDROID_ADB_SERVER_PORT, 10) || 5037;
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
