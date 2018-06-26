/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

const path = require('path');
const fs = require('fs');
const metro = require('metro');
const HOME_DIR = require('os').homedir();

module.exports = (reloadCallback, pluginPaths, pluginCache) => {
  const plugins = pluginEntryPoints(pluginPaths);
  if (!fs.existsSync(pluginCache)) {
    fs.mkdirSync(pluginCache);
  }
  watchChanges(plugins, reloadCallback, pluginCache);
  return Promise.all(
    Object.values(plugins).map(plugin =>
      compilePlugin(plugin, false, pluginCache),
    ),
  )
    .then(dynamicPlugins => {
      // eslint-disable-next-line no-console
      console.log('✅  Compiled all plugins.');
      return dynamicPlugins;
    })
    .catch(console.error);
};

function watchChanges(plugins, reloadCallback, pluginCache) {
  // eslint-disable-next-line no-console
  console.log('🕵️‍  Watching for plugin changes');

  Object.values(plugins).map(plugin =>
    fs.watch(plugin.rootDir, (eventType, filename) => {
      // eslint-disable-next-line no-console
      console.log(`🕵️‍  Detected changes in ${plugin.name}`);
      compilePlugin(plugin, true, pluginCache).then(reloadCallback);
    }),
  );
}
function hash(string) {
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
const createModuleIdFactory = () => filePath => {
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
function pluginEntryPoints(additionalPaths = []) {
  const defaultPluginPath = path.join(HOME_DIR, '.sonar', 'node_modules');
  const entryPoints = entryPointForPluginFolder(defaultPluginPath);
  if (typeof additionalPaths === 'string') {
    additionalPaths = [additionalPaths];
  }
  additionalPaths.forEach(additionalPath => {
    const additionalPlugins = entryPointForPluginFolder(additionalPath);
    Object.keys(additionalPlugins).forEach(key => {
      entryPoints[key] = additionalPlugins[key];
    });
  });
  return entryPoints;
}
function entryPointForPluginFolder(pluginPath) {
  pluginPath = pluginPath.replace('~', HOME_DIR);
  if (!fs.existsSync(pluginPath)) {
    return {};
  }
  return fs
    .readdirSync(pluginPath)
    .filter(name =>
      /*name.startsWith('sonar-plugin') && */ fs
        .lstatSync(path.join(pluginPath, name))
        .isDirectory(),
    )
    .filter(Boolean)
    .map(name => {
      let packageJSON;
      try {
        packageJSON = fs
          .readFileSync(path.join(pluginPath, name, 'package.json'))
          .toString();
      } catch (e) {}
      if (packageJSON) {
        try {
          const pkg = JSON.parse(packageJSON);
          return {
            packageJSON: pkg,
            name: pkg.name,
            entry: path.join(pluginPath, name, pkg.main || 'index.js'),
            rootDir: path.join(pluginPath, name),
          };
        } catch (e) {
          console.error(
            `Could not load plugin "${pluginPath}", because package.json is invalid.`,
          );
          console.error(e);
          return null;
        }
      }
    })
    .filter(Boolean)
    .reduce((acc, cv) => {
      acc[cv.name] = cv;
      return acc;
    }, {});
}
function changeExport(path) {
  let file = fs.readFileSync(path);
  file = file
    .toString()
    .replace(
      /\nrequire\((-?[0-9]+)\);\n*$/,
      (_, moduleID) =>
        `\nmodule.exports = global.require(${moduleID}).default;`,
    );
  fs.writeFileSync(path, file);
}
function compilePlugin(
  {rootDir, name, entry, packageJSON},
  force,
  pluginCache,
) {
  return new Promise((resolve, reject) => {
    const fileName = `${name}@${packageJSON.version || '0.0.0'}.js`;
    const out = path.join(pluginCache, fileName);
    const result = Object.assign({}, packageJSON, {rootDir, name, entry, out});
    // check if plugin needs to be compiled
    if (
      !force &&
      fs.existsSync(out) &&
      fs.lstatSync(rootDir).atime < fs.lstatSync(out).ctime
    ) {
      // eslint-disable-next-line no-console
      console.log(`🥫  Using cached version of ${name}...`);
      resolve(result);
    } else {
      console.log(`⚙️  Compiling ${name}...`); // eslint-disable-line no-console
      metro
        .runBuild({
          config: {
            getProjectRoots: () => [rootDir, path.join(__dirname, '..')],
            getTransformModulePath: () =>
              path.join(__dirname, 'transforms', 'index.js'),
            // a custom hash function is required, because by default metro starts
            // numbering the modules by 1. This means all plugins would start at
            // ID 1, which causes a clash. This is why we have a custom IDFactory.
            createModuleIdFactory,
          },
          dev: false,
          entry,
          out,
        })
        .then(() => {
          changeExport(out);
          resolve(result);
        })
        .catch(err => {
          console.error(
            `❌  Plugin ${name} is ignored, because it could not be compiled.`,
          );
          console.error(err);
        });
    }
  });
}
