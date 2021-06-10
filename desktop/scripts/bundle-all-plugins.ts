/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

/* eslint-disable flipper/no-console-error-without-context */

import {pluginsDir} from './paths';
import path from 'path';
import {runBuild} from 'flipper-pkg-lib';
import {getWorkspaces} from './workspaces';

async function bundleAllPlugins() {
  const plugins = await getWorkspaces().then((workspaces) =>
    workspaces.packages.filter((x) => x.isPlugin),
  );
  const errors = new Map<string, any>();
  for (const plugin of plugins) {
    const relativeDir = path.relative(pluginsDir, plugin.dir);
    console.log(`Bundling "${relativeDir}"`);
    console.time(`Finished bundling "${relativeDir}"`);
    try {
      await runBuild(plugin.dir, false);
    } catch (err) {
      console.log(`Failed to bundle "${relativeDir}": ${err.message}`);
      errors.set(relativeDir, err);
    } finally {
      console.timeEnd(`Finished bundling "${relativeDir}"`);
    }
  }
  if (errors.size) {
    console.error('---');
    for (const [plugin, error] of errors) {
      console.error(`Failed to bundle ${plugin}`);
      console.error(error);
      console.error('---');
    }
    throw new Error(
      `Failed to bundle ${errors.size} plugins: ${[...errors.keys()].join(
        ', ',
      )}`,
    );
  }
}

bundleAllPlugins()
  .then(() => {
    process.exit(0);
  })
  .catch((err: any) => {
    console.error(err);
    process.exit(1);
  });
