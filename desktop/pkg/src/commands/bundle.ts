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
import fs from 'fs-extra';
import path from 'path';
import {runBuild, getPluginDetails} from 'flipper-pkg-lib';

export default class Bundle extends Command {
  public static description = 'transpiles and bundles plugin';

  public static examples = [`$ flipper-pkg bundle path/to/plugin`];

  public static args: args.IArg[] = [
    {
      name: 'directory',
      required: false,
      default: '.',
      description:
        'Path to plugin package directory for bundling. Defaults to the current working directory.',
    },
  ];

  public static flags = {
    watch: flags.boolean(),
  };

  public async run() {
    const {args, flags} = this.parse(Bundle);
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

    const success = await runBuildOnce(inputDirectory, plugin.source, out);
    if (!flags.watch) {
      process.exit(success ? 0 : 1);
    } else {
      enterWatchMode(inputDirectory, plugin.source, out);
    }
  }
}

async function runBuildOnce(
  inputDirectory: string,
  source: string,
  out: string,
) {
  try {
    await runBuild(inputDirectory, source, out);
    console.log('✅  Build succeeded');
    return true;
  } catch (e) {
    console.error(e);
    console.error('🥵  Build failed');
    return false;
  }
}

function enterWatchMode(inputDirectory: string, source: string, out: string) {
  console.log(`⏳  Waiting for changes...`);
  let isBuilding = false;
  let pendingChanges = false;
  fs.watch(
    path.join(inputDirectory, 'src'),
    {
      recursive: true,
    },
    async () => {
      pendingChanges = true;
      if (isBuilding) {
        return; // prevent kicking of a second build
      }
      isBuilding = true;
      while (pendingChanges) {
        pendingChanges = false;
        await runBuildOnce(inputDirectory, source, out);
      }
      isBuilding = false;
      console.log(`⏳  Waiting for changes...`);
    },
  );
}
