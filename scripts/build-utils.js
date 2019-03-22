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
const cp = require('child-process-es6-promise');

function die(err) {
  console.error(err.stack);
  process.exit(1);
}

function compileDefaultPlugins(defaultPluginDir) {
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
          defaultPlugins.map(({entry, rootDir, out, ...plugin}) => ({
            ...plugin,
            out: path.parse(out).base,
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
      resolver: {
        blacklistRE: /\/(sonar|flipper-public)\/dist\//,
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
    tmp.dir({prefix: 'flipper-build-'}, (err, buildFolder) => {
      if (err) {
        reject(err);
      } else {
        resolve(buildFolder);
      }
    });
  }).catch(die);
}

function getVersionNumber() {
  let {version} = require('../package.json');
  const buildNumber = process.argv.join(' ').match(/--version=(\d+)/);
  if (buildNumber && buildNumber.length > 0) {
    version = [...version.split('.').slice(0, 2), buildNumber[1]].join('.');
  }
  return version;
}

// Asynchronously determine current mercurial revision as string or `null` in case of any error.
function genMercurialRevision() {
  return cp
    .spawn('hg', ['log', '-r', '.', '-T', '{node}'])
    .catch(err => null)
    .then(res => (res && res.stdout) || null);
}

module.exports = {
  buildFolder,
  compile,
  die,
  compileDefaultPlugins,
  getVersionNumber,
  genMercurialRevision,
};
