/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import util from 'util';
import {exec as execImport} from 'child_process';
const exec = util.promisify(execImport);

const cmd = 'klist --json';
const endWith = '@THEFACEBOOK.COM';

export async function isFBEmployee(): Promise<boolean> {
  return exec(cmd).then(
    (stdobj: {stderr: string; stdout: string}) => {
      const principal = String(JSON.parse(stdobj.stdout).principal);

      return principal.endsWith(endWith);
    },
    (_err: Error) => {
      return false;
    },
  );
}
