/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
const path = require('path');
const fs = require('fs-extra');
const builder = require('electron-builder');
const Platform = builder.Platform;
const {
  buildFolder,
  compile,
  die,
  compileDefaultPlugins,
} = require('./build-utils.js');

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

function modifyPackageManifest(buildFolder) {
  // eslint-disable-next-line no-console
  console.log('Creating package.json manifest');
  const manifest = require('../package.json');
  const manifestStatic = require('../static/package.json');

  // The manifest's dependencies are bundled with the final app by
  // electron-builder. We want to bundle the dependencies from the static-folder
  // because all dependencies from the root-folder are already bundled by metro.
  manifest.dependencies = manifestStatic.dependencies;
  manifest.main = 'index.js';

  const buildNumber = process.argv.join(' ').match(/--version=(\d+)/);
  if (buildNumber && buildNumber.length > 0) {
    manifest.version = [
      ...manifest.version.split('.').slice(0, 2),
      buildNumber[1],
    ].join('.');
  }

  return new Promise((resolve, reject) => {
    fs.writeFile(
      path.join(buildFolder, 'package.json'),
      JSON.stringify(manifest, null, '  '),
      err => {
        if (err) {
          reject(err);
        } else {
          resolve(manifest.version);
        }
      },
    );
  }).catch(die);
}

function buildDist(buildFolder) {
  const targetsRaw = [];

  if (process.argv.indexOf('--mac') > -1) {
    targetsRaw.push(Platform.MAC.createTarget(['zip']));
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

  return builder
    .build({
      appDir: buildFolder,
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
    })
    .catch(die);
}

function copyStaticFolder(buildFolder) {
  return new Promise((resolve, reject) => {
    fs.copy(
      path.join(__dirname, '..', 'static'),
      buildFolder,
      {
        dereference: true,
      },
      err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      },
    );
  }).catch(die);
}

(async () => {
  const dir = await buildFolder();
  // eslint-disable-next-line no-console
  console.log('Created build directory', dir);
  await copyStaticFolder(dir);
  await compileDefaultPlugins(path.join(dir, 'defaultPlugins'));
  await compile(dir, path.join(__dirname, '..', 'src', 'init.js'));
  const versionNumber = await modifyPackageManifest(dir);
  generateManifest(versionNumber);
  await buildDist(dir);
  // eslint-disable-next-line no-console
  console.log('✨  Done');
  process.exit();
})();
