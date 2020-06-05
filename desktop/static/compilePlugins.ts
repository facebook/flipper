/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import path from 'path';
import fs from 'fs-extra';
import util from 'util';
import recursiveReaddir from 'recursive-readdir';
import pMap from 'p-map';
import {homedir} from 'os';
import {PluginDetails} from 'flipper-plugin-lib';
import {runBuild} from 'flipper-pkg-lib';
import {getSourcePlugins, getInstalledPlugins} from './getPlugins';
import startWatchPlugins from './startWatchPlugins';
import ensurePluginFoldersWatchable from './ensurePluginFoldersWatchable';

const HOME_DIR = homedir();

const DEFAULT_COMPILE_OPTIONS: CompileOptions = {
  force: false,
  failSilently: true,
  recompileOnChanges: true,
};

export type CompileOptions = {
  force: boolean;
  failSilently: boolean;
  recompileOnChanges: boolean;
};

export type CompiledPluginDetails = PluginDetails & {entry: string};

export default async function (
  reloadCallback: (() => void) | null,
  pluginCache: string,
  options: CompileOptions = DEFAULT_COMPILE_OPTIONS,
): Promise<CompiledPluginDetails[]> {
  if (process.env.FLIPPER_FAST_REFRESH) {
    console.log(
      '🥫  Skipping loading of installed plugins because Fast Refresh is enabled',
    );
    return [];
  }
  await ensurePluginFoldersWatchable();
  options = Object.assign({}, DEFAULT_COMPILE_OPTIONS, options);
  const defaultPlugins = (
    await fs.readJson(path.join(__dirname, 'defaultPlugins', 'index.json'))
  ).map((p: any) => p.name) as string[];
  const dynamicPlugins = [
    ...(await getInstalledPlugins()),
    ...(await getSourcePlugins()).filter(
      (p) => !defaultPlugins.includes(p.name),
    ),
  ];
  await fs.ensureDir(pluginCache);
  if (options.recompileOnChanges) {
    await startWatchChanges(
      dynamicPlugins,
      reloadCallback,
      pluginCache,
      options,
    );
  }
  const compilations = pMap(
    dynamicPlugins,
    (plugin) => {
      return compilePlugin(plugin, pluginCache, options);
    },
    {concurrency: 4},
  );

  const compiledDynamicPlugins = (await compilations).filter(
    (c) => c !== null,
  ) as CompiledPluginDetails[];
  console.log('✅  Compiled all plugins.');
  return compiledDynamicPlugins;
}
async function startWatchChanges(
  plugins: PluginDetails[],
  reloadCallback: (() => void) | null,
  pluginCache: string,
  options: CompileOptions = DEFAULT_COMPILE_OPTIONS,
) {
  const filteredPlugins = plugins
    // no hot reloading for plugins in .flipper folder. This is to prevent
    // Flipper from reloading, while we are doing changes on thirdparty plugins.
    .filter(
      (plugin) => !plugin.dir.startsWith(path.join(HOME_DIR, '.flipper')),
    );
  const watchOptions = Object.assign({}, options, {force: true});
  await startWatchPlugins(filteredPlugins, (plugin) =>
    compilePlugin(plugin, pluginCache, watchOptions).then(
      reloadCallback ?? (() => {}),
    ),
  );
}
async function mostRecentlyChanged(dir: string) {
  const files = await util.promisify<string, string[]>(recursiveReaddir)(dir);
  return files
    .map((f) => fs.lstatSync(f).ctime)
    .reduce((a, b) => (a > b ? a : b), new Date(0));
}
async function compilePlugin(
  pluginDetails: PluginDetails,
  pluginCache: string,
  {force, failSilently}: CompileOptions,
): Promise<CompiledPluginDetails | null> {
  const {dir, specVersion, version, main, source, name} = pluginDetails;
  if (specVersion > 1) {
    // eslint-disable-next-line no-console
    const entry = path.join(dir, main);
    if (await fs.pathExists(entry)) {
      console.log(`🥫  Using pre-built version of ${name}: ${entry}...`);
      return Object.assign({}, pluginDetails, {entry});
    } else {
      console.error(
        `❌  Plugin ${name} is ignored, because its entry point not found: ${entry}.`,
      );
      return null;
    }
  } else {
    const entry = path.join(pluginCache, `${name}@${version || '0.0.0'}.js`);
    const result = Object.assign({}, pluginDetails, {entry});
    const rootDirCtime = await mostRecentlyChanged(dir);
    if (
      !force &&
      (await fs.pathExists(entry)) &&
      rootDirCtime < (await fs.lstat(entry)).ctime
    ) {
      // eslint-disable-next-line no-console
      console.log(`🥫  Using cached version of ${name}...`);
      return result;
    } else {
      // eslint-disable-line no-console
      console.log(`⚙️  Compiling ${name}...`);
      try {
        await runBuild(dir, source, entry);
      } catch (e) {
        if (failSilently) {
          console.error(
            `❌  Plugin ${name} is ignored, because it could not be compiled.`,
          );
          console.error(e);
          return null;
        } else {
          throw e;
        }
      }
      return result;
    }
  }
}
