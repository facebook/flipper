/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

const path = require('path');
const fs = require('fs-extra');
const builder = require('electron-builder');
const Platform = builder.Platform;
const cp = require('promisify-child-process');
const {
  buildFolder,
  compile,
  compileMain,
  die,
  compileDefaultPlugins,
  getVersionNumber,
  genMercurialRevision,
} = require('./build-utils.js');
const fetch = require('node-fetch');
const {
  ICONS,
  buildLocalIconPath,
  getIconURL,
} = require('../src/utils/icons.js');

function generateManifest(versionNumber) {
  const filePath = path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(filePath);
  }
  fs.writeFileSync(
    path.join(__dirname, '../dist/manifest.json'),
    JSON.stringify({
      package: 'com.facebook.sonar',
      version_name: versionNumber,
    }),
  );
}

function modifyPackageManifest(buildFolder, versionNumber, hgRevision) {
  // eslint-disable-next-line no-console
  console.log('Creating package.json manifest');
  const manifest = require('../package.json');
  const manifestStatic = require('../static/package.json');

  // The manifest's dependencies are bundled with the final app by
  // electron-builder. We want to bundle the dependencies from the static-folder
  // because all dependencies from the root-folder are already bundled by metro.
  manifest.dependencies = manifestStatic.dependencies;
  manifest.main = 'index.js';
  manifest.version = versionNumber;
  if (hgRevision != null) {
    manifest.revision = hgRevision;
  }
  fs.writeFileSync(
    path.join(buildFolder, 'package.json'),
    JSON.stringify(manifest, null, '  '),
  );
}

async function buildDist(buildFolder) {
  const targetsRaw = [];
  const postBuildCallbacks = [];

  if (process.argv.indexOf('--mac') > -1) {
    targetsRaw.push(Platform.MAC.createTarget(['dir', 'dmg']));
    postBuildCallbacks.push(() =>
      cp.spawn('zip', ['-qyr9', '../Flipper-mac.zip', 'Flipper.app'], {
        cwd: path.join(__dirname, '..', 'dist', 'mac'),
        encoding: 'utf-8',
      }),
    );
  }
  if (process.argv.indexOf('--linux') > -1) {
    targetsRaw.push(Platform.LINUX.createTarget(['zip']));
  }
  if (process.argv.indexOf('--win') > -1) {
    targetsRaw.push(Platform.WINDOWS.createTarget(['zip']));
  }
  if (!targetsRaw.length) {
    throw new Error('No targets specified. eg. --mac, --win, or --linux');
  }

  // merge all target maps into a single map
  let targetsMerged = [];
  for (const target of targetsRaw) {
    targetsMerged = targetsMerged.concat(Array.from(target));
  }
  const targets = new Map(targetsMerged);

  const electronDownload = {};
  if (process.env.electron_config_cache) {
    electronDownload.cache = process.env.electron_config_cache;
  }

  try {
    await builder.build({
      publish: 'never',
      config: {
        appId: `com.facebook.sonar`,
        directories: {
          buildResources: path.join(__dirname, '..', 'static'),
          output: path.join(__dirname, '..', 'dist'),
        },
        electronDownload,
        npmRebuild: false,
      },
      projectDir: buildFolder,
      targets,
    });
    return await Promise.all(postBuildCallbacks.map(p => p()));
  } catch (err) {
    return die(err);
  }
}

function copyStaticFolder(buildFolder) {
  fs.copySync(path.join(__dirname, '..', 'static'), buildFolder, {
    dereference: true,
  });
}

function downloadIcons(buildFolder) {
  const iconURLs = Object.entries(ICONS).reduce((acc, [name, sizes]) => {
    acc.push(
      // get icons in @1x and @2x
      ...sizes.map(size => ({name, size, density: 1})),
      ...sizes.map(size => ({name, size, density: 2})),
    );
    return acc;
  }, []);

  return Promise.all(
    iconURLs.map(({name, size, density}) => {
      const url = getIconURL(name, size, density);
      return fetch(url)
        .then(res => {
          if (res.status !== 200) {
            throw new Error(
              // eslint-disable-next-line prettier/prettier
              `Could not download the icon ${name} from ${url}: got status ${
                res.status
              }`,
            );
          }
          return res;
        })
        .then(
          res =>
            new Promise((resolve, reject) => {
              const fileStream = fs.createWriteStream(
                path.join(buildFolder, buildLocalIconPath(name, size, density)),
              );
              res.body.pipe(fileStream);
              res.body.on('error', reject);
              fileStream.on('finish', resolve);
            }),
        );
    }),
  );
}

(async () => {
  const dir = await buildFolder();
  // eslint-disable-next-line no-console
  console.log('Created build directory', dir);
  await compileMain({dev: false});
  copyStaticFolder(dir);
  await downloadIcons(dir);
  await compileDefaultPlugins(path.join(dir, 'defaultPlugins'));
  await compile(dir, path.join(__dirname, '..', 'src', 'init.tsx'));
  const versionNumber = getVersionNumber();
  const hgRevision = await genMercurialRevision();
  modifyPackageManifest(dir, versionNumber, hgRevision);
  generateManifest(versionNumber);
  await buildDist(dir);
  // eslint-disable-next-line no-console
  console.log('✨  Done');
  process.exit();
})();
