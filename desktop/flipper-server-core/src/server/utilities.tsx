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

/**
 * Checks if a socket is in used for given path.
 * If the path doesn't exist then is not in use. If it does,
 * create a socket client and attempt to connect to it.
 * If the connection is established, then there's a process
 * already listening. Otherwise, it kind of indicates the
 * contrary.
 * @param path Path used instead of port number.
 * @returns True or false dependning on whether the socket is in
 * use or not.
 */
export async function checkSocketInUse(path: string): Promise<boolean> {
  if (!(await fs.pathExists(path))) {
    return false;
  }
  return new Promise((resolve, _reject) => {
    const client = net
      .createConnection(path, () => {
        resolve(true);
        client.destroy();
      })
      .on('error', (e) => {
        if (e.message.includes('ECONNREFUSED')) {
          resolve(false);
        } else {
          console.warn(
            `[conn] Socket ${path} is in use, but we don't know why.`,
            e,
          );
          resolve(false);
        }
        client.destroy();
      });
  });
}

/**
 * Creates a socket path. Used to open the socket at location.
 * Format: flipper-server-${userInfo}.sock
 * @returns The created socket path.
 */
export async function makeSocketPath(): Promise<string> {
  const runtimeDir = xdgBasedir.runtime || '/tmp';
  await fs.mkdirp(runtimeDir);
  const filename = `flipper-server-${os.userInfo().uid}.sock`;
  const path = `${runtimeDir}/${filename}`;

  // Depending on the OS this is between 104 and 108:
  // https://unix.stackexchange.com/a/367012/10198
  if (path.length >= 104) {
    console.warn(
      'Ignoring XDG_RUNTIME_DIR as it would exceed the total limit for domain socket paths. See man 7 unix.',
    );
    // Even with the INT32_MAX userid, we should have plenty of room.
    return `/tmp/${filename}`;
  }

  return path;
}
