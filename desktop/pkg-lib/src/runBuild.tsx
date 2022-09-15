/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import path from 'path';
import fs from 'fs-extra';
import {getInstalledPluginDetails} from 'flipper-plugin-lib';
import {build} from 'esbuild';

interface RunBuildConfig {
  pluginDir: string;
  entry: string;
  out: string;
  dev: boolean;
  node?: boolean;
}

async function runBuild({pluginDir, entry, out, dev, node}: RunBuildConfig) {
  await build({
    entryPoints: [path.join(pluginDir, entry)],
    bundle: true,
    outfile: out,
    platform: node ? 'node' : 'browser',
    format: 'cjs',
    // This list should match `dispatcher/plugins.tsx` and `builtInModules` in `desktop/.eslintrc.js`
    external: [
      'flipper-plugin',
      'flipper',
      'react',
      'react-dom',
      'react-dom/client',
      'react-is',
      'antd',
      'immer',
      '@emotion/styled',
      '@ant-design/icons',
      // It is an optional dependency for rollup that we use in react-devtools
      'fsevents',
    ],
    sourcemap: 'external',
    minify: !dev,
  });
}

export default async function bundlePlugin(pluginDir: string, dev: boolean) {
  const stat = await fs.lstat(pluginDir);
  if (!stat.isDirectory()) {
    throw new Error(`Plugin source ${pluginDir} is not a directory.`);
  }
  const packageJsonPath = path.join(pluginDir, 'package.json');
  if (!(await fs.pathExists(packageJsonPath))) {
    throw new Error(
      `package.json is not found in plugin source directory ${pluginDir}.`,
    );
  }
  const plugin = await getInstalledPluginDetails(pluginDir);

  if (typeof plugin.deprecated === 'string') {
    console.warn(
      `Skip bundling plugin source ${pluginDir} is deprecated: ${plugin.deprecated}`,
    );
    return;
  }

  const bundleConfigs: RunBuildConfig[] = [];

  await fs.ensureDir(path.dirname(plugin.entry));
  bundleConfigs.push({
    pluginDir,
    entry: plugin.source,
    out: plugin.entry,
    dev,
  });

  if (
    plugin.serverAddOnSource &&
    plugin.serverAddOn &&
    plugin.serverAddOnEntry
  ) {
    await fs.ensureDir(path.dirname(plugin.serverAddOnEntry));
    bundleConfigs.push({
      pluginDir,
      entry: plugin.serverAddOnSource,
      out: plugin.serverAddOnEntry,
      dev,
      node: true,
    });
  }

  await Promise.all(bundleConfigs.map((config) => runBuild(config)));
}
