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
import runLint from '../utils/runLint';

export default class Lint extends Command {
  public static description = 'validates a plugin package directory';

  public static examples = [`$ flipper-pkg lint path/to/plugin`];

  public static args: args.IArg[] = [
    {
      name: 'directory',
      required: false,
      default: '.',
      description:
        'Path to plugin package directory for linting. Defaults to the current working directory.',
    },
  ];

  public async run() {
    const {args} = this.parse(Lint);
    const inputDirectory: string = path.resolve(process.cwd(), args.directory);
    try {
      console.log(`⚙️  Validating ${inputDirectory}`);
      const errors = await runLint(inputDirectory);
      if (errors) {
        this.error(
          `Plugin package definition is invalid. See https://fbflipper.com/docs/extending/js-setup.html#plugin-definition for details.\n${errors.join(
            '\n',
          )}`,
        );
      }
    } catch (error) {
      this.error(error);
    }
    console.log('✅  Plugin package definition is valid');
  }
}
