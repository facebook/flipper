/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

const Metro = require('../static/node_modules/metro');
const compilePlugins = require('../static/compilePlugins');
const util = require('util');
const tmp = require('tmp');
const path = require('path');
const fs = require('fs-extra');
const cp = require('promisify-child-process');
const recursiveReaddir = require('recursive-readdir');

function mostRecentlyChanged(dir, ignores) {
  return util
    .promisify(recursiveReaddir)(dir, ignores)
    .then(files =>
      files
        .map(f => fs.lstatSync(f).ctime)
        .reduce((a, b) => (a > b ? a : b), new Date(0)),
    );
}

function die(err) {
  console.error(err.stack);
  process.exit(1);
}

function compileDefaultPlugins(defaultPluginDir, skipAll = false) {
  return compilePlugins(
    null,
    skipAll
      ? []
      : [
          path.join(__dirname, '..', 'src', 'plugins'),
          path.join(__dirname, '..', 'src', 'fb', 'plugins'),
        ],
    defaultPluginDir,
    {force: true, failSilently: false, recompileOnChanges: false},
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
  console.log(`⚙️  Compiling renderer bundle...`);
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
        blacklistRE: /(\/|\\)(sonar|flipper|flipper-public)(\/|\\)(dist|doctor)(\/|\\)|(\.native\.js$)/,
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
  )
    .then(() => console.log('✅  Compiled renderer bundle.'))
    .catch(die);
}

async function compileMain({dev}) {
  const staticDir = path.resolve(__dirname, '..', 'static');
  const out = path.join(staticDir, 'main.bundle.js');
  // check if main needs to be compiled
  if (await fs.pathExists(out)) {
    const staticDirCtime = await mostRecentlyChanged(staticDir, ['*.bundle.*']);
    const bundleCtime = (await fs.lstat(out)).ctime;
    if (staticDirCtime < bundleCtime) {
      console.log(`🥫  Using cached version of main bundle...`);
      return;
    }
  }
  console.log(`⚙️  Compiling main bundle...`);
  try {
    const config = Object.assign({}, await Metro.loadConfig(), {
      reporter: {update: () => {}},
      projectRoot: staticDir,
      watchFolders: [staticDir],
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
        sourceExts: ['tsx', 'ts', 'js'],
        blacklistRE: /(\/|\\)(sonar|flipper|flipper-public)(\/|\\)(dist|doctor)(\/|\\)|(\.native\.js$)/,
      },
    });
    await Metro.runBuild(config, {
      platform: 'web',
      entry: path.join(staticDir, 'main.ts'),
      out,
      dev,
      minify: false,
      sourceMap: true,
      resetCache: true,
    });
    console.log('✅  Compiled main bundle.');
  } catch (err) {
    die(err);
  }
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
} // Asynchronously determine current mercurial revision as string or `null` in case of any error.
function genMercurialRevision() {
  return cp
    .spawn('hg', ['log', '-r', '.', '-T', '{node}'], {encoding: 'utf8'})
    .catch(err => null)
    .then(res => (res && res.stdout) || null);
}
module.exports = {
  buildFolder,
  compile,
  compileMain,
  die,
  compileDefaultPlugins,
  getVersionNumber,
  genMercurialRevision,
};
