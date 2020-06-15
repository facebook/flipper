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
import {Platform, Arch, ElectronDownloadOptions, build} from 'electron-builder';
import {spawn} from 'promisify-child-process';
import {
  buildFolder,
  compileRenderer,
  compileMain,
  die,
  getVersionNumber,
  genMercurialRevision,
  generatePluginEntryPoints,
} from './build-utils';
import fetch from 'node-fetch';
import {getIcons, buildLocalIconPath, getIconURL} from '../app/src/utils/icons';
import isFB from './isFB';
import copyPackageWithDependencies from './copy-package-with-dependencies';
import {staticDir, distDir} from './paths';

async function generateManifest(versionNumber: string) {
  await fs.writeFile(
    path.join(distDir, 'manifest.json'),
    JSON.stringify({
      package: 'com.facebook.sonar',
      version_name: versionNumber,
    }),
  );
}

async function modifyPackageManifest(
  buildFolder: string,
  versionNumber: string,
  hgRevision: string | null,
) {
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
  await fs.writeFile(
    path.join(buildFolder, 'package.json'),
    JSON.stringify(manifest, null, '  '),
  );
}

async function buildDist(buildFolder: string) {
  const targetsRaw: Map<Platform, Map<Arch, string[]>>[] = [];
  const postBuildCallbacks: (() => void)[] = [];

  if (process.argv.indexOf('--mac') > -1) {
    targetsRaw.push(Platform.MAC.createTarget(['dir']));
    // You can build mac apps on Linux but can't build dmgs, so we separate those.
    if (process.argv.indexOf('--mac-dmg') > -1) {
      targetsRaw.push(Platform.MAC.createTarget(['dmg']));
    }
    postBuildCallbacks.push(() =>
      spawn('zip', ['-qyr9', '../Flipper-mac.zip', 'Flipper.app'], {
        cwd: path.join(distDir, 'mac'),
        encoding: 'utf-8',
      }),
    );
  }
  if (process.argv.indexOf('--linux') > -1) {
    targetsRaw.push(Platform.LINUX.createTarget(['zip']));

    const argv = process.argv.slice(2);
    if (argv.indexOf('--linux-deb') > -1) {
      // linux targets can be:
      // AppImage, snap, deb, rpm, freebsd, pacman, p5p, apk, 7z, zip, tar.xz, tar.lz, tar.gz, tar.bz2, dir
      targetsRaw.push(Platform.LINUX.createTarget(['deb']));
    }
    if (argv.indexOf('--linux-snap') > -1) {
      targetsRaw.push(Platform.LINUX.createTarget(['snap']));
    }
  }
  if (process.argv.indexOf('--win') > -1) {
    targetsRaw.push(Platform.WINDOWS.createTarget(['zip']));
  }
  if (!targetsRaw.length) {
    throw new Error('No targets specified. eg. --mac, --win, or --linux');
  }

  // merge all target maps into a single map
  let targetsMerged: [Platform, Map<Arch, string[]>][] = [];
  for (const target of targetsRaw) {
    targetsMerged = targetsMerged.concat(Array.from(target));
  }
  const targets = new Map(targetsMerged);

  const electronDownloadOptions: ElectronDownloadOptions = {};
  if (process.env.electron_config_cache) {
    electronDownloadOptions.cache = process.env.electron_config_cache;
  }

  try {
    await build({
      publish: 'never',
      config: {
        appId: `com.facebook.sonar`,
        productName: 'Flipper',
        directories: {
          buildResources: buildFolder,
          output: distDir,
        },
        electronDownload: electronDownloadOptions,
        npmRebuild: false,
        linux: {
          executableName: 'flipper',
        },
        mac: {
          bundleVersion: '50.0.0',
        },
      },
      projectDir: buildFolder,
      targets,
    });
    return await Promise.all(postBuildCallbacks.map((p) => p()));
  } catch (err) {
    return die(err);
  }
}

async function copyStaticFolder(buildFolder: string) {
  console.log(`⚙️  Copying static package with dependencies...`);
  await copyPackageWithDependencies(staticDir, buildFolder);
  console.log('✅  Copied static package with dependencies.');
}

function downloadIcons(buildFolder: string) {
  const iconURLs = Object.entries(getIcons()).reduce<
    {
      name: string;
      size: number;
      density: number;
    }[]
  >((acc, [name, sizes]) => {
    acc.push(
      // get icons in @1x and @2x
      ...sizes.map((size) => ({name, size, density: 1})),
      ...sizes.map((size) => ({name, size, density: 2})),
    );
    return acc;
  }, []);

  return Promise.all(
    iconURLs.map(({name, size, density}) => {
      const url = getIconURL(name, size, density);
      return fetch(url)
        .then((res) => {
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
          (res) =>
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
  if (isFB) {
    process.env.FLIPPER_FB = 'true';
  }
  const dir = await buildFolder();
  // eslint-disable-next-line no-console
  console.log('Created build directory', dir);

  await compileMain();
  await generatePluginEntryPoints();
  await copyStaticFolder(dir);
  await downloadIcons(dir);
  await compileRenderer(dir);
  const versionNumber = getVersionNumber();
  const hgRevision = await genMercurialRevision();
  await modifyPackageManifest(dir, versionNumber, hgRevision);
  await fs.ensureDir(distDir);
  await generateManifest(versionNumber);
  await buildDist(dir);
  // eslint-disable-next-line no-console
  console.log('✨  Done');
  process.exit();
})();
