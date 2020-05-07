/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Command, flags} from '@oclif/command';
import {args} from '@oclif/parser';
import runMigrate from '../utils/runMigrate';
import path from 'path';

export default class Migrate extends Command {
  public static description =
    'migrates a Flipper desktop plugin to the latest version of specification';

  public static examples = [`$ flipper-pkg migrate path/to/plugin`];

  public static flags = {
    'no-dependencies': flags.boolean({
      description:
        'Do not add or change package dependencies during migration.',
      default: false,
    }),
    'no-scripts': flags.boolean({
      description: 'Do not add or change package scripts during migration.',
      default: false,
    }),
  };

  public static args: args.IArg[] = [
    {
      name: 'directory',
      required: false,
      default: '.',
      description:
        'Path to the plugin directory. Defaults to the current working directory.',
    },
  ];

  public async run() {
    const {args, flags} = this.parse(Migrate);
    const dir: string = path.resolve(process.cwd(), args.directory);
    const noDependencies = flags['no-dependencies'];
    const noScripts = flags['no-scripts'];
    const error = await runMigrate(dir, {noDependencies, noScripts});
    if (error) {
      this.error(error);
    }
  }
}
