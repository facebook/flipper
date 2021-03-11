/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Command} from '@oclif/command';
import {args} from '@oclif/parser';
import path from 'path';
import {computePackageChecksum} from 'flipper-pkg-lib';

export default class Lint extends Command {
  public static description =
    'computes the total checksum of all the package files';

  public static examples = [`$ flipper-pkg checksum path/to/plugin`];

  public static args: args.IArg[] = [
    {
      name: 'directory',
      required: false,
      default: '.',
      description:
        'Path to plugin package directory. Defaults to the current working directory.',
    },
  ];

  public async run() {
    const {args} = this.parse(Lint);
    const inputDirectory: string = path.resolve(process.cwd(), args.directory);
    const checksum = await computePackageChecksum(inputDirectory);
    console.log(checksum);
  }
}
