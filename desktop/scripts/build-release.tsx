/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import path from 'path';
import fs from 'fs-extra';
import {
  Platform,
  Arch,
  ElectronDownloadOptions,
  build,
  AfterPackContext,
  AppInfo,
} from 'electron-builder';
import {spawn} from 'promisify-child-process';
import {
  buildFolder,
  compileRenderer,
  compileMain,
  die,
  getVersionNumber,
  genMercurialRevision,
  prepareDefaultPlugins,
  moveSourceMaps,
} from './build-utils';
import isFB from './isFB';
import copyPackageWithDependencies from './copy-package-with-dependencies';
import {staticDir, distDir} from './paths';
import yargs from 'yargs';
import {WinPackager} from 'app-builder-lib/out/winPackager';
import {downloadIcons} from './build-icons';

// Used in some places to avoid release-to-release changes. Needs
// to be this high for some MacOS-specific things that I can't
// remember right now.
const FIX_RELEASE_VERSION = '50.0.0';

const argv = yargs
  .usage('yarn build [args]')
  .version(false)
  .options({
    mac: {
      type: 'boolean',
      group: 'targets',
    },
    'mac-dmg': {
      type: 'boolean',
      group: 'targets',
    },
    win: {
      type: 'boolean',
      group: 'targets',
    },
    linux: {
      type: 'boolean',
      group: 'targets',
    },
    'linux-deb': {
      type: 'boolean',
      group: 'targets',
    },
    'linux-snap': {
      type: 'boolean',
      group: 'targets',
    },
    version: {
      description:
        'Unique build identifier to be used as the version patch part for the build',
      type: 'number',
    },
    channel: {
      description: 'Release channel for the build',
      choices: ['stable', 'insiders'],
      default: 'stable',
    },
    'default-plugins-dir': {
      describe:
        'Directory with prepared list of default plugins which will be included into the Flipper distribution as "defaultPlugins" dir',
      type: 'string',
    },
    'source-map-dir': {
      describe:
        'Directory to write the main.bundle.map and bundle.map files for the main and render bundle sourcemaps, respectively',
      type: 'string',
    },
  })
  .help()
  .check((argv) => {
    const targetSpecified =
      argv.mac ||
      argv['mac-dmg'] ||
      argv.win ||
      argv.linux ||
      argv['linux-deb'] ||
      argv['linux-snap'];
    if (!targetSpecified) {
      throw new Error('No targets specified. eg. --mac, --win, or --linux');
    }
    return true;
  })
  .parse(process.argv.slice(1));

if (isFB) {
  process.env.FLIPPER_FB = 'true';
}

process.env.FLIPPER_RELEASE_CHANNEL = argv.channel;

if (argv['default-plugins-dir']) {
  process.env.FLIPPER_DEFAULT_PLUGINS_DIR = argv['default-plugins-dir'];
}

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
  channel: string,
) {
  // eslint-disable-next-line no-console
  console.log('Creating package.json manifest');
  // eslint-disable-next-line flipper/no-relative-imports-across-packages
  const manifest = require('../package.json');
  // eslint-disable-next-line flipper/no-relative-imports-across-packages
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
  manifest.releaseChannel = channel;
  await fs.writeFile(
    path.join(buildFolder, 'package.json'),
    JSON.stringify(manifest, null, '  '),
  );
}

// Same as for MacOS, we are hardcoding version information and other
// properties on Windows that change from release to release to improve cache
// behaviour. This is especially important as the .exe contains the Electron/Chromium
// frameworks which are > 120 MB in size.
// Note: This is run *after* packing has completed, meaning that ZIP file will
// not include these changes. As our packer operates on the unpacked results,
// this doesn't matter.
async function afterPack(context: AfterPackContext) {
  if (context.electronPlatformName !== 'win32' || !isFB) {
    return;
  }

  // Because all of this is implemented in an OOP way,
  // we're having to do a lot of hacky shit here to
  // temporarily override properties. While it may look
  // cleaner to just have a big ts-ignore block, by
  // only disabling `readonly` flags, we at least
  // get remaining guarantees regarding type alignment
  // and property names being present.
  type Mutable<T> = {-readonly [P in keyof T]: T[P]};
  const originalPackager = Object.assign({}, context.packager);
  const packager = context.packager as unknown as WinPackager;
  const appInfo: Mutable<AppInfo> = packager.appInfo;
  const exeFileName = `${packager.appInfo.productFilename}.exe`;
  appInfo.version = FIX_RELEASE_VERSION;
  appInfo.buildVersion = FIX_RELEASE_VERSION;
  appInfo.shortVersion = FIX_RELEASE_VERSION;
  // Contains a side-effect dependent on the current year.
  Object.defineProperty(appInfo, 'copyright', {
    get: () => 'Facebook, Inc.',
  });
  packager.signAndEditResources(
    path.join(context.appOutDir, exeFileName),
    context.arch,
    context.outDir,
    path.basename(exeFileName, '.exe'),
    packager.platformSpecificBuildOptions.requestedExecutionLevel,
  );
  (context as Mutable<AfterPackContext>).packager = originalPackager;
}

async function buildDist(buildFolder: string) {
  const targetsRaw: Map<Platform, Map<Arch, string[]>>[] = [];
  const postBuildCallbacks: (() => void)[] = [];

  if (argv.mac || argv['mac-dmg']) {
    targetsRaw.push(Platform.MAC.createTarget(['dir']));
    // You can build mac apps on Linux but can't build dmgs, so we separate those.
    if (argv['mac-dmg']) {
      targetsRaw.push(Platform.MAC.createTarget(['dmg']));
    }
    const macPath = path.join(
      distDir,
      process.arch === 'arm64' ? 'mac-arm64' : 'mac',
    );
    postBuildCallbacks.push(() =>
      spawn('zip', ['-qyr9', '../Flipper-mac.zip', 'Flipper.app'], {
        cwd: macPath,
        encoding: 'utf-8',
      }),
    );
  }
  if (argv.linux || argv['linux-deb'] || argv['linux-snap']) {
    targetsRaw.push(Platform.LINUX.createTarget(['zip']));

    if (argv['linux-deb']) {
      // linux targets can be:
      // AppImage, snap, deb, rpm, freebsd, pacman, p5p, apk, 7z, zip, tar.xz, tar.lz, tar.gz, tar.bz2, dir
      targetsRaw.push(Platform.LINUX.createTarget(['deb']));
    }
    if (argv['linux-snap']) {
      targetsRaw.push(Platform.LINUX.createTarget(['snap']));
    }
  }
  if (argv.win) {
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
          bundleVersion: FIX_RELEASE_VERSION,
        },
        win: {
          signAndEditExecutable: !isFB,
        },
        afterPack,
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

(async () => {
  const dir = await buildFolder();
  // eslint-disable-next-line no-console
  console.log('Created build directory', dir);

  await compileMain();
  await prepareDefaultPlugins(argv.channel === 'insiders');
  await copyStaticFolder(dir);
  await downloadIcons(dir);
  await compileRenderer(dir);
  await moveSourceMaps(dir, argv['source-map-dir']);
  const versionNumber = getVersionNumber(argv.version);
  const hgRevision = await genMercurialRevision();
  await modifyPackageManifest(dir, versionNumber, hgRevision, argv.channel);
  await fs.ensureDir(distDir);
  await generateManifest(versionNumber);
  await buildDist(dir);
  // eslint-disable-next-line no-console
  console.log('✨  Done');
  process.exit();
})();
