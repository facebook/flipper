/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

declare module "child-process-es6-promise" {
  export function exec(command: string, options: void): Promise<{stdout: string, stderr: string}>;
}
