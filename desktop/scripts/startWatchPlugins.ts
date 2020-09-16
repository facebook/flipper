/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import Watchman from './watchman';
import {getPluginSourceFolders} from 'flipper-plugin-lib';

export default async function startWatchPlugins(
  onChanged: () => void | Promise<void>,
) {
  // eslint-disable-next-line no-console
  console.log('🕵️‍  Watching for plugin changes');

  let delayedCompilation: NodeJS.Timeout | undefined;
  const kCompilationDelayMillis = 1000;
  const onPluginChangeDetected = () => {
    if (!delayedCompilation) {
      delayedCompilation = setTimeout(() => {
        delayedCompilation = undefined;
        // eslint-disable-next-line no-console
        console.log(`🕵️‍  Detected plugin change`);
        onChanged();
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

async function startWatchingPluginsUsingWatchman(onChange: () => void) {
  const pluginFolders = await getPluginSourceFolders();
  await Promise.all(
    pluginFolders.map(async (pluginFolder) => {
      const watchman = new Watchman(pluginFolder);
      await watchman.initialize();
      await watchman.startWatchFiles('.', () => onChange(), {
        excludes: ['**/__tests__/**/*', '**/node_modules/**/*', '**/.*'],
      });
    }),
  );
}
