/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Command, flags} from '@oclif/command';
import {promises as fs} from 'fs';
import {mkdirp, pathExists, readJSON} from 'fs-extra';
import * as inquirer from 'inquirer';
import * as path from 'path';

interface BundleArgs {
  inputDirectory: string;
  outputFile: string;
}

async function bundle(_args: BundleArgs) {
  throw new Error('Not implemented.');
}

async function deriveOutputFileName(inputDirectory: string): Promise<string> {
  const packageJson = await readJSON(path.join(inputDirectory, 'package.json'));
  return `${packageJson.name || ''}-${packageJson.version}.vsix`;
}

export default class Bundle extends Command {
  public static description =
    'bundle a plugin folder into a distributable archive';

  public static examples = [`$ flipper-pkg bundle path/to/plugin`];

  public static flags = {
    output: flags.string({
      char: 'o',
      default: '.',
      description:
        "Where to output the bundle, file or directory. Defaults to '.'.",
    }),
  };

  public static args = [{name: 'directory', required: true}];

  public async run() {
    const {args, flags: parsedFlags} = this.parse(Bundle);

    const stat = await fs.lstat(args.directory);
    if (!stat.isDirectory()) {
      this.error(`Plugin source ${args.directory} is not a directory.`);
    }

    let output;
    if (await pathExists(parsedFlags.output)) {
      const outputStat = await fs.lstat(parsedFlags.output);
      if (outputStat.isDirectory()) {
        output = path.resolve(
          path.join(
            parsedFlags.output,
            await deriveOutputFileName(args.directory),
          ),
        );
      } else {
        output = parsedFlags.output;
      }
    } else {
      let dir;
      let file = null;
      // Treat this as a
      if (parsedFlags.output.slice(-1) === '/') {
        dir = parsedFlags.output;
      } else {
        dir = path.dirname(parsedFlags.output);
        file = path.basename(parsedFlags.output);
      }

      if (!(await pathExists(dir))) {
        const answer: {confirm: boolean} = await inquirer.prompt({
          default: true,
          message: `Output directory '${dir}' doesn't exist. Create it?`,
          name: 'confirm',
          type: 'confirm',
        });

        if (answer.confirm) {
          mkdirp(dir);
        } else {
          this.error(`Output directory ${dir} not found.`);
        }
      }

      if (file === null) {
        file = await deriveOutputFileName(args.directory);
      }
      output = path.join(dir, file);
    }

    const bundleArgs: BundleArgs = {
      inputDirectory: args.directory,
      outputFile: output,
    };
    this.log('Bundling: ', bundleArgs);
    bundle(bundleArgs);
  }
}
