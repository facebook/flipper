/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import os from 'os';
import xdgBasedir from 'xdg-basedir';
import net from 'net';
import fs from 'fs-extra';

/**
 * Checks if a port is in use.
 * @param port The port to check.
 * @returns True if the port is in use. Otherwise, false.
 */
export async function checkPortInUse(port: number): Promise<boolean> {
  interface HttpError extends Error {
    code?: string;
  }

  return new Promise((resolve, reject) => {
    const tester = net
      .createServer()
      .once('error', function (err: HttpError) {
        if (err.code != 'EADDRINUSE') return reject(err);
        resolve(true);
      })
      .once('listening', function () {
        tester
          .once('close', function () {
            resolve(false);
          })
          .close();
      })
      .listen(port);
  });
}
