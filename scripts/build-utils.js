/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

const Metro = require('../static/node_modules/metro');
const compilePlugins = require('../static/compilePlugins');
const tmp = require('tmp');
const path = require('path');
const fs = require('fs-extra');

function die(err) {
  console.error(err.stack);
  process.exit(1);
}

function compileDefaultPlugins(buildFolder) {
  const defaultPluginFolder = 'defaultPlugins';
  const defaultPluginDir = path.join(buildFolder, defaultPluginFolder);
  return compilePlugins(
    null,
    [
      path.join(__dirname, '..', 'src', 'plugins'),
      path.join(__dirname, '..', 'src', 'fb', 'plugins'),
    ],
    defaultPluginDir,
    {force: true, failSilently: false},
  )
    .then(defaultPlugins =>
      fs.writeFileSync(
        path.join(defaultPluginDir, 'index.json'),
        JSON.stringify(
          defaultPlugins.map(plugin => ({
            ...plugin,
            out: path.join(defaultPluginFolder, path.parse(plugin.out).base),
          })),
        ),
      ),
    )
    .catch(die);
}

function compile(buildFolder, entry) {
  // eslint-disable-next-line no-console
  console.log('Building main bundle', entry);

  const projectRoots = path.join(__dirname, '..');
  return Metro.runBuild(
    {
      reporter: {update: () => {}},
      projectRoot: projectRoots,
      watchFolders: [projectRoots],
      serializer: {},
      transformer: {
        babelTransformerPath: path.join(
          __dirname,
          '..',
          'static',
          'transforms',
          'index.js',
        ),
      },
    },
    {
      dev: false,
      minify: false,
      resetCache: true,
      sourceMap: true,
      entry,
      out: path.join(buildFolder, 'bundle.js'),
    },
  ).catch(die);
}

function buildFolder() {
  // eslint-disable-next-line no-console
  console.log('Creating build directory');
  return new Promise((resolve, reject) => {
    tmp.dir((err, buildFolder) => {
      if (err) {
        reject(err);
      } else {
        resolve(buildFolder);
      }
    });
  }).catch(die);
}

module.exports = {
  buildFolder,
  compile,
  die,
  compileDefaultPlugins,
};
