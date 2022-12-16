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
import {build, Plugin} from 'esbuild';

// https://github.com/evanw/esbuild/issues/1979#issuecomment-1026988439
const resolveFbStubsToFbPlugin: Plugin = {
  name: 'resolve-fb-stubs-to-fb',
  setup({onResolve}) {
    onResolve({filter: /fb-stubs/}, (args) => {
      let moduleName = args.path.replace('fb-stubs', 'fb');
      if (!moduleName.endsWith('.tsx')) {
        moduleName = `${moduleName}.tsx`;
      }
      return {
        path: path.resolve(args.resolveDir, moduleName),
      };
    });
  },
};

interface RunBuildConfig {
  pluginDir: string;
  entry: string;
  out: string;
  dev: boolean;
  node?: boolean;
  sourceMapPath?: string;
  intern: boolean;
}

async function runBuild({
  pluginDir,
  entry,
  out,
  dev,
  node,
  sourceMapPath,
  intern,
}: RunBuildConfig) {
  await build({
    entryPoints: [path.join(pluginDir, entry)],
    bundle: true,
    outfile: out,
    platform: node ? 'node' : 'browser',
    format: 'cjs',
    // This list should match `dispatcher/plugins.tsx` and `builtInModules` in `desktop/.eslintrc.js`
    external: [
      'flipper',
      'flipper-plugin',
      'react',
      'react-dom',
      'react-dom/client',
      'react-is',
      'antd',
      'immer',
      '@emotion/styled',
      '@emotion/css',
      '@ant-design/icons',
      // It is an optional dependency for rollup that we use in react-devtools
      'fsevents',
      // Allow desktop plugins that require electron to build (deprecated)
      'electron',
    ],
    sourcemap: dev ? 'inline' : 'external',
    minify: !dev,
    plugins: intern ? [resolveFbStubsToFbPlugin] : undefined,
  });

  const sourceMapUrl = `${out}.map`;
  if (
    sourceMapPath &&
    path.resolve(sourceMapPath) !== path.resolve(sourceMapUrl)
  ) {
    console.info(`Moving plugin sourcemap to ${sourceMapPath}`);
    await fs.ensureDir(path.dirname(sourceMapPath));
    await fs.move(sourceMapUrl, sourceMapPath, {overwrite: true});
  }
}

type Options = {
  sourceMapPath?: string;
  sourceMapPathServerAddOn?: string;
};

export default async function bundlePlugin(
  pluginDir: string,
  dev: boolean,
  intern: boolean,
  options?: Options,
) {
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
    sourceMapPath: options?.sourceMapPath,
    intern,
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
      sourceMapPath: options?.sourceMapPathServerAddOn,
      intern,
    });
  }

  await Promise.all(bundleConfigs.map((config) => runBuild(config)));
}
