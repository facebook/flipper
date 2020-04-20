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
import fs from 'fs-extra';
import path from 'path';
import {runBuild, getPluginDetails} from 'flipper-pkg-lib';

export default class Bundle extends Command {
  public static description = 'transpiles and bundles plugin';

  public static examples = [`$ flipper-pkg bundle optional/path/to/directory`];

  public static args: args.IArg[] = [
    {
      name: 'directory',
      required: false,
      default: '.',
      description:
        'Path to plugin package directory for bundling. Defaults to the current working directory.',
    },
  ];

  public async run() {
    const {args} = this.parse(Bundle);
    const inputDirectory: string = path.resolve(process.cwd(), args.directory);
    const stat = await fs.lstat(inputDirectory);
    if (!stat.isDirectory()) {
      this.error(`Plugin source ${inputDirectory} is not a directory.`);
    }
    const packageJsonPath = path.join(inputDirectory, 'package.json');
    if (!(await fs.pathExists(packageJsonPath))) {
      this.error(
        `package.json is not found in plugin source directory ${inputDirectory}.`,
      );
    }
    const plugin = await getPluginDetails(inputDirectory);
    const out = path.resolve(inputDirectory, plugin.main);
    await fs.ensureDir(path.dirname(out));
    await runBuild(inputDirectory, plugin.source, out);
  }
}
