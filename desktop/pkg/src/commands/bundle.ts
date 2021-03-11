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
import {runBuild} from 'flipper-pkg-lib';

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
    watch: flags.boolean({
      description:
        'Watch for plugin source code and bundle it after every change.',
      default: false,
    }),
    production: flags.boolean({
      description:
        'Force env.NODE_ENV=production, enable minification and disable producing source maps.',
      default: false,
    }),
  };

  public async run() {
    const {args, flags} = this.parse(Bundle);
    const inputDirectory: string = path.resolve(process.cwd(), args.directory);
    const success = await runBuildOnce(inputDirectory, !flags.production);
    if (!flags.watch) {
      process.exit(success ? 0 : 1);
    } else {
      enterWatchMode(inputDirectory, !flags.production);
    }
  }
}

async function runBuildOnce(inputDirectory: string, dev: boolean) {
  try {
    await runBuild(inputDirectory, dev);
    console.log('✅  Build succeeded');
    return true;
  } catch (e) {
    console.error(e);
    console.error('🥵  Build failed');
    return false;
  }
}

function enterWatchMode(inputDirectory: string, dev: boolean) {
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
        await runBuildOnce(inputDirectory, dev);
      }
      isBuilding = false;
      console.log(`⏳  Waiting for changes...`);
    },
  );
}
