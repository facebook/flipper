/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {exec} from 'promisify-child-process';
import {notNull} from '../utils/typeUtils';
import {kill} from 'process';

// Kills any orphaned Instruments processes belonging to the user.
//
// In some cases, we've seen interactions between Instruments and the iOS
// simulator that cause hung instruments and DTServiceHub processes. If
// enough instances pile up, the host machine eventually becomes
// unresponsive. Until the underlying issue is resolved, manually kill any
// orphaned instances (where the parent process has died and PPID is 1)
// before launching another instruments run.
export async function killOrphanedInstrumentsProcesses() {
  const result = await exec('ps -e -o user,ppid,pid,comm');
  result.stdout
    ?.toString()
    .split('\n')
    .filter(notNull)
    .map((a) => /^(\S+)\s+1\s+(\d+)\s+(.+)$/.exec(a))
    .filter(notNull)
    .filter((m) => m[1] === process.env.USER)
    .filter(
      (m) =>
        m[3] &&
        ['/instruments', '/DTServiceHub'].some((name) => m[3].endsWith(name)),
    )
    .forEach((m) => {
      const pid = m[2];
      console.debug(`Killing orphaned Instruments process: ${pid}`);
      kill(parseInt(pid, 10), 'SIGKILL');
    });
}
