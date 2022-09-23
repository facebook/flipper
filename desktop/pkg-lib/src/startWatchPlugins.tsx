/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import Watchman from './watchman';
import {
  getInstalledPluginDetails,
  getPluginSourceFolders,
  isPluginDir,
} from 'flipper-plugin-lib';
import path from 'path';
import chalk from 'chalk';
import runBuild from './runBuild';
import {InstalledPluginDetails} from 'flipper-common';
import {getDefaultPlugins} from './getDefaultPlugins';
import {buildDefaultPlugins} from './buildDefaultPlugins';

async function rebuildPlugin(pluginPath: string, intern: boolean) {
  try {
    await runBuild(pluginPath, true, intern);
    console.info(chalk.green('Rebuilt plugin'), pluginPath);
  } catch (e) {
    console.error(
      chalk.red(
        'Failed to compile a plugin, waiting for additional changes...',
      ),
      e,
    );
  }
}

export default async function startWatchPlugins(
  isInsidersBuild: boolean,
  intern: boolean,
  onChanged?: (
    changedPlugins: InstalledPluginDetails[],
  ) => void | Promise<void>,
) {
  // eslint-disable-next-line no-console
  console.log('🕵️‍  Watching for plugin changes');

  let delayedCompilation: NodeJS.Timeout | undefined;
  const kCompilationDelayMillis = 1000;
  const onPluginChangeDetected = (root: string, files: string[]) => {
    if (!delayedCompilation) {
      delayedCompilation = setTimeout(async () => {
        delayedCompilation = undefined;
        // eslint-disable-next-line no-console
        console.log(`🕵️‍  Detected plugin change`);
        try {
          const changedDirs = await Promise.all(
            // https://facebook.github.io/watchman/docs/nodejs.html#subscribing-to-changes
            files.map(async (file: string) => {
              const filePathAbs = path.resolve(root, file);
              let dirPath = path.dirname(filePathAbs);
              while (
                // Stop when we reach plugin root
                !(await isPluginDir(dirPath))
              ) {
                const relative = path.relative(root, dirPath);
                // Stop when we reach desktop/plugins folder
                if (!relative || relative.startsWith('..')) {
                  console.info(
                    chalk.yellow(
                      'Failed to find a plugin root for path. Rebuilding all plugins',
                    ),
                    filePathAbs,
                  );
                  throw new Error('REBUILD_ALL');
                }
                dirPath = path.resolve(dirPath, '..');
              }
              await rebuildPlugin(dirPath, intern);
              return dirPath;
            }),
          );
          const changedPlugins = await Promise.all(
            changedDirs.map((dirPath) => getInstalledPluginDetails(dirPath)),
          );
          onChanged?.(changedPlugins);
        } catch (e) {
          if (e instanceof Error && e.message === 'REBUILD_ALL') {
            const defaultPlugins = await getDefaultPlugins(isInsidersBuild);
            await buildDefaultPlugins(defaultPlugins, true, intern);
            onChanged?.(defaultPlugins);
            return;
          }
          throw e;
        }
      }, kCompilationDelayMillis);
    }
  };
  try {
    await startWatchingPluginsUsingWatchman(onPluginChangeDetected);
  } catch (err) {
    console.error(
      'Failed to start watching plugin files using Watchman, continue without hot reloading',
      err,
    );
  }
}

async function startWatchingPluginsUsingWatchman(
  onChange: (root: string, files: string[]) => void,
) {
  const pluginFolders = await getPluginSourceFolders();
  await Promise.all(
    pluginFolders.map(async (pluginFolder) => {
      const watchman = new Watchman(pluginFolder);
      await watchman.initialize();
      await watchman.startWatchFiles(
        '.',
        ({files}) => onChange(pluginFolder, files),
        {
          excludes: [
            '**/__tests__/**/*',
            '**/node_modules/**/*',
            '**/dist/*',
            '**/.*',
          ],
        },
      );
    }),
  );
}
