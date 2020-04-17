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
import Metro from 'metro';
import util from 'util';
import recursiveReaddir from 'recursive-readdir';
import pMap from 'p-map';
import {homedir} from 'os';
import {getWatchFolders} from 'flipper-pkg';
import {default as getPlugins, PluginManifest, PluginInfo} from './getPlugins';
import startWatchPlugins from './startWatchPlugins';

const HOME_DIR = homedir();

let metroDir: string | undefined;
const metroDirPromise = getMetroDir().then((dir) => (metroDir = dir));

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

export type CompiledPluginInfo = PluginManifest & {out: string};

export default async function (
  reloadCallback: (() => void) | null,
  pluginCache: string,
  options: CompileOptions = DEFAULT_COMPILE_OPTIONS,
): Promise<CompiledPluginInfo[]> {
  if (process.env.FLIPPER_FAST_REFRESH) {
    console.log(
      '🥫  Skipping loading of third-party plugins because Fast Refresh is enabled',
    );
    return [];
  }
  options = Object.assign({}, DEFAULT_COMPILE_OPTIONS, options);
  const defaultPlugins = (
    await fs.readJson(path.join(__dirname, 'defaultPlugins', 'index.json'))
  ).map((p: any) => p.name) as string[];
  const dynamicPlugins = (await getPlugins(true)).filter(
    (p) => !defaultPlugins.includes(p.name),
  );
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
  ) as CompiledPluginInfo[];
  console.log('✅  Compiled all plugins.');
  return compiledDynamicPlugins;
}
async function startWatchChanges(
  plugins: PluginInfo[],
  reloadCallback: (() => void) | null,
  pluginCache: string,
  options: CompileOptions = DEFAULT_COMPILE_OPTIONS,
) {
  const filteredPlugins = plugins
    // no hot reloading for plugins in .flipper folder. This is to prevent
    // Flipper from reloading, while we are doing changes on thirdparty plugins.
    .filter(
      (plugin) => !plugin.rootDir.startsWith(path.join(HOME_DIR, '.flipper')),
    );
  const watchOptions = Object.assign({}, options, {force: true});
  await startWatchPlugins(filteredPlugins, (plugin) =>
    compilePlugin(plugin, pluginCache, watchOptions).then(
      reloadCallback ?? (() => {}),
    ),
  );
}
function hash(string: string) {
  let hash = 0;
  if (string.length === 0) {
    return hash;
  }
  let chr;
  for (let i = 0; i < string.length; i++) {
    chr = string.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return hash;
}
const fileToIdMap = new Map();
const createModuleIdFactory = () => (filePath: string) => {
  if (filePath === '__prelude__') {
    return 0;
  }
  let id = fileToIdMap.get(filePath);
  if (typeof id !== 'number') {
    id = hash(filePath);
    fileToIdMap.set(filePath, id);
  }
  return id;
};
async function mostRecentlyChanged(dir: string) {
  const files = await util.promisify<string, string[]>(recursiveReaddir)(dir);
  return files
    .map((f) => fs.lstatSync(f).ctime)
    .reduce((a, b) => (a > b ? a : b), new Date(0));
}
async function getMetroDir() {
  let dir = __dirname;
  while (true) {
    const dirToCheck = path.join(dir, 'node_modules', 'metro');
    if (await fs.pathExists(dirToCheck)) return dirToCheck;
    const nextDir = path.dirname(dir);
    if (!nextDir || nextDir === '' || nextDir === dir) {
      break;
    }
    dir = nextDir;
  }
  return __dirname;
}
async function compilePlugin(
  pluginInfo: PluginInfo,
  pluginCache: string,
  {force, failSilently}: CompileOptions,
): Promise<CompiledPluginInfo | null> {
  const {rootDir, manifest, entry, name} = pluginInfo;
  const bundleMain = manifest.bundleMain ?? path.join('dist', 'index.js');
  const bundlePath = path.join(rootDir, bundleMain);
  const dev = process.env.NODE_ENV !== 'production';
  if (await fs.pathExists(bundlePath)) {
    // eslint-disable-next-line no-console
    const out = path.join(rootDir, bundleMain);
    console.log(`🥫  Using pre-built version of ${name}: ${out}...`);
    return Object.assign({}, pluginInfo.manifest, {out});
  } else {
    const out = path.join(
      pluginCache,
      `${name}@${manifest.version || '0.0.0'}.js`,
    );
    const result = Object.assign({}, pluginInfo.manifest, {out});
    const rootDirCtime = await mostRecentlyChanged(rootDir);
    if (
      !force &&
      (await fs.pathExists(out)) &&
      rootDirCtime < (await fs.lstat(out)).ctime
    ) {
      // eslint-disable-next-line no-console
      console.log(`🥫  Using cached version of ${name}...`);
      return result;
    } else {
      // eslint-disable-line no-console
      console.log(`⚙️  Compiling ${name}...`);
      try {
        await Metro.runBuild(
          {
            reporter: {update: () => {}},
            projectRoot: rootDir,
            watchFolders: [metroDir || (await metroDirPromise)].concat(
              await getWatchFolders(rootDir),
            ),
            serializer: {
              getRunModuleStatement: (moduleID: string) =>
                `module.exports = global.__r(${moduleID}).default;`,
              createModuleIdFactory,
            },
            transformer: {
              babelTransformerPath: global.electronResolve
                ? global.electronResolve('flipper-babel-transformer') // when compilation is executing in Electron main process
                : require.resolve('flipper-babel-transformer'), // when compilation is is executing in Node.js script
            },
            resolver: {
              sourceExts: ['tsx', 'ts', 'js'],
              blacklistRE: /\.native\.js$/,
            },
          },
          {
            entry: entry.replace(rootDir, '.'),
            out,
            dev,
            sourceMap: true,
            minify: false,
            resetCache: !dev,
          },
        );
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
