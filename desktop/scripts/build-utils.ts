/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

const Metro = require('../static/node_modules/metro');
import compilePlugins from '../static/compilePlugins';
import util from 'util';
import tmp from 'tmp';
import path from 'path';
import fs from 'fs-extra';
import {spawn} from 'promisify-child-process';
import recursiveReaddir from 'recursive-readdir';

async function mostRecentlyChanged(
  dir: string,
  ignores: string[],
): Promise<Date> {
  const files = await util.promisify<string, string[], string[]>(
    recursiveReaddir,
  )(dir, ignores);
  return files
    .map(f => fs.lstatSync(f).ctime)
    .reduce((a, b) => (a > b ? a : b), new Date(0));
}

export function die(err: Error) {
  console.error(err.stack);
  process.exit(1);
}

export function compileDefaultPlugins(
  defaultPluginDir: string,
  skipAll: boolean = false,
) {
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

export function compile(buildFolder: string, entry: string) {
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
        blacklistRE: /(\/|\\)(sonar|flipper|flipper-public)(\/|\\)(desktop)(\/|\\)(dist|doctor)(\/|\\)|(\.native\.js$)/,
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

export async function compileMain({dev}: {dev: boolean}) {
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
        blacklistRE: /(\/|\\)(sonar|flipper|flipper-public)(\/|\\)(desktop)(\/|\\)(dist|doctor)(\/|\\)|(\.native\.js$)/,
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
export function buildFolder(): Promise<string> {
  // eslint-disable-next-line no-console
  console.log('Creating build directory');
  return new Promise<string>((resolve, reject) => {
    tmp.dir({prefix: 'flipper-build-'}, (err, buildFolder) => {
      if (err) {
        reject(err);
      } else {
        resolve(buildFolder);
      }
    });
  }).catch(e => {
    die(e);
    return '';
  });
}
export function getVersionNumber() {
  let {version} = require('../package.json');
  const buildNumber = process.argv.join(' ').match(/--version=(\d+)/);
  if (buildNumber && buildNumber.length > 0) {
    version = [...version.split('.').slice(0, 2), buildNumber[1]].join('.');
  }
  return version;
}

// Asynchronously determine current mercurial revision as string or `null` in case of any error.
export function genMercurialRevision(): Promise<string | null> {
  return spawn('hg', ['log', '-r', '.', '-T', '{node}'], {encoding: 'utf8'})
    .then(
      res =>
        (res &&
          (typeof res.stdout === 'string'
            ? res.stdout
            : res.stdout?.toString())) ||
        null,
    )
    .catch(() => null);
}
