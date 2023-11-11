/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import net from 'net';
import fetch from 'node-fetch';
import {EnvironmentInfo} from 'flipper-common';
import semver from 'semver';

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
 * Checks if a running Flipper server is available on the given port.
 * @param port The port to check.
 * @returns If successful, it will return the version of the running
 * Flipper server. Otherwise, undefined.
 */
export async function checkServerRunning(
  port: number,
): Promise<string | undefined> {
  try {
    const response = await fetch(`http://localhost:${port}/info`, {
      timeout: 1000,
    });
    if (response.status >= 200 && response.status < 300) {
      const environmentInfo: EnvironmentInfo = await response.json();
      return environmentInfo.appVersion;
    } else {
      console.info(
        '[flipper-server] Running instance found, failed with HTTP status code: ',
        response.status,
      );
    }
  } catch (e) {
    console.info(
      `[flipper-server] No running instance found, error found: ${e}`,
    );
  }
}

/**
 * Attempts to shutdown an existing Flipper server instance.
 * @param port The port of the running Flipper server
 * @returns Returns true if the shutdown was successful. Otherwise, false.
 */
export async function shutdownRunningInstance(port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${port}/shutdown`, {
      timeout: 1000,
    });
    if (response.status >= 200 && response.status < 300) {
      const json = await response.json();
      console.info(
        `[flipper-server] Shutdown request acknowledge: ${json?.success}`,
      );
      return json?.success;
    } else {
      console.warn(
        '[flipper-server] Shutdown request not handled, HTTP status code: ',
        response.status,
      );
    }
  } catch (e) {
    console.warn('[flipper-server] Shutdown request failed with error: ', e);
  }

  return false;
}

/**
 * Compares two versions excluding build identifiers
 * (the bit after + in the semantic version string).
 * @return 0 if v1 == v2, 1 if v1 is greater, -1 if v2 is greater.
 */
export function compareServerVersion(v1: string, v2: string): number {
  return semver.compare(v1, v2);
}
