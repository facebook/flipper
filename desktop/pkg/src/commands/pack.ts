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
import {promises as fs} from 'fs';
import {mkdirp, pathExists, readJSON, ensureDir} from 'fs-extra';
import * as inquirer from 'inquirer';
import * as path from 'path';
import * as yarn from '../utils/yarn';
import cli from 'cli-ux';
import {runBuild} from 'flipper-pkg-lib';
import {getInstalledPluginDetails} from 'flipper-plugin-lib';

async function deriveOutputFileName(inputDirectory: string): Promise<string> {
  const packageJson = await readJSON(path.join(inputDirectory, 'package.json'));
  return `${packageJson.name || ''}-${packageJson.version}.tgz`;
}

export default class Pack extends Command {
  public static description =
    'packs a plugin folder into a distributable archive';

  public static examples = [`$ flipper-pkg pack path/to/plugin`];

  public static flags = {
    output: flags.string({
      char: 'o',
      default: '.',
      description:
        'Where to output the package, file or directory. Defaults to the current working directory.',
    }),
    production: flags.boolean({
      description:
        'Force env.NODE_ENV=production, enable minification and disable producing source maps.',
      default: false,
    }),
  };

  public static args: args.IArg[] = [
    {
      name: 'directory',
      required: false,
      default: '.',
      description:
        'Path to plugin package directory to pack. Defaults to the current working directory.',
    },
  ];

  public async run() {
    const {args, flags: parsedFlags} = this.parse(Pack);

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

    const inputDirectory = path.resolve(args.directory);
    const outputFile = path.resolve(output);

    this.log(`⚙️  Packing ${inputDirectory} to ${outputFile}...`);

    cli.action.start('Installing dependencies');
    await yarn.install(inputDirectory);
    cli.action.stop();

    cli.action.start('Reading plugin details');
    const plugin = await getInstalledPluginDetails(inputDirectory);
    const out = path.resolve(inputDirectory, plugin.main);
    cli.action.stop(`done. Source: ${plugin.source}. Main: ${plugin.main}.`);

    cli.action.start(`Compiling`);
    await ensureDir(path.dirname(out));
    await runBuild(inputDirectory, plugin.source, out, parsedFlags.production);
    cli.action.stop();

    cli.action.start(`Packing to ${outputFile}`);
    await yarn.pack(inputDirectory, outputFile);
    cli.action.stop();

    this.log(`✅  Packed ${inputDirectory} to ${outputFile}`);
  }
}
