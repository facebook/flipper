/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import proc from 'child_process';

function execADB(
  command: string,
  device: string | null,
  ...args: Array<string>
): Promise<string> {
  const deviceSpecifier = device != null && device !== '' ? `-s ${device}` : '';
  return new Promise((resolve, reject) => {
    const adb = `adb ${deviceSpecifier} ${command} ${args.join(' ')}`;
    proc.exec(adb, (error, stdout, _stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

export async function reverse(
  local: number,
  remote: number,
  device?: string,
): Promise<string> {
  return await execADB(
    `reverse tcp:${local} tcp:${remote}`,
    device != null ? device : null,
  );
}
