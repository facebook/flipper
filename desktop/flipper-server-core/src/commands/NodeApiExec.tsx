/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {ExecError, FlipperServerCommands} from 'flipper-common';
import {exec} from 'child_process';
import assert from 'assert';

export const commandNodeApiExec: FlipperServerCommands['node-api-exec'] =
  async (command, options) =>
    new Promise((resolve, reject) =>
      exec(command, options, (error, stdout, stderr) => {
        assert(typeof stdout === 'string');
        assert(typeof stderr === 'string');
        if (error) {
          const wrappedError: ExecError = {
            message: error.message,
            stdout,
            stderr,
            cmd: error.cmd,
            killed: error.killed,
            code: error.code,
            stack: error.stack,
          };
          reject(wrappedError);
          return;
        }

        resolve({
          stdout,
          stderr,
        });
      }),
    );
