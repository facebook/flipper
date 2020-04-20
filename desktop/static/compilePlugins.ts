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
import {getWatchFolders, PluginDetails} from 'flipper-pkg-lib';
import getPlugins from './getPlugins';
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

export type CompiledPluginDetails = PluginDetails & {entry: string};

export default async function (
  reloadCallback: (() => void) | null,
  pluginCache: string,
  options: CompileOptions = DEFAULT_COMPILE_OPTIONS,
): Promise<CompiledPluginDetails[]> {
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
  pluginDetails: PluginDetails,
  pluginCache: string,
  {force, failSilently}: CompileOptions,
): Promise<CompiledPluginDetails | null> {
  const {dir, specVersion, version, main, source, name} = pluginDetails;
  const dev = process.env.NODE_ENV !== 'production';
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
        await Metro.runBuild(
          {
            reporter: {update: () => {}},
            projectRoot: dir,
            watchFolders: [metroDir || (await metroDirPromise)].concat(
              await getWatchFolders(dir),
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
            entry: source,
            out: entry,
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
