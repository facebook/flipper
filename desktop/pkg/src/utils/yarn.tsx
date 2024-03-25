/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import * as util from 'util';
import {exec as execImport} from 'child_process';
const exec = util.promisify(execImport);

const WINDOWS = /^win/.test(process.platform);
const YARN_PATH = `yarn${WINDOWS ? '.cmd' : ''}`;

export async function install(pkgDir: string) {
  const {stderr} = await exec(YARN_PATH, {
    cwd: pkgDir,
  });
  if (stderr) {
    console.warn(stderr);
  }
}

export async function pack(pkgDir: string, out: string) {
  const {stderr} = await exec(
    [YARN_PATH, 'pack', '--filename', out].join(' '),
    {
      cwd: pkgDir,
    },
  );
  if (stderr) {
    console.warn(stderr);
  }
}
