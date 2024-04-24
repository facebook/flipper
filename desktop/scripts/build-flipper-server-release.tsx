/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

const dotenv = require('dotenv').config();
import path from 'path';
import os from 'os';
import tar from 'tar';
import {
  buildBrowserBundle,
  buildFolder,
  compileServerMain,
  genMercurialRevision,
  getVersionNumber,
  prepareDefaultPlugins,
  moveServerSourceMaps,
} from './build-utils';
import {
  defaultPluginsDir,
  distDir,
  serverDir,
  staticDir,
  rootDir,
  sonarDir,
} from './paths';
import isFB from './isFB';
import yargs from 'yargs';
import fs from 'fs-extra';
import {downloadIcons} from './build-icons';
import {spawn, exec as execAsync} from 'promisify-child-process';
import {homedir} from 'os';
import {need as pkgFetch} from 'pkg-fetch';
import {exec} from 'child_process';
import fetch from '@adobe/node-fetch-retry';
import plist from 'simple-plist';

// This needs to be tested individually. As of 2022Q2, node17 is not supported.
const SUPPORTED_NODE_PLATFORM = 'node16';
// Node version below is only used for macOS AARCH64 builds as we download
// the binary directly from Node distribution site instead of relying on pkg-fetch.
const NODE_VERSION = 'v16.15.0';

enum BuildPlatform {
  LINUX = 'linux',
  WINDOWS = 'windows',
  MAC_X64 = 'mac-x64',
  MAC_AARCH64 = 'mac-aarch64',
}

const LINUX_STARTUP_SCRIPT = `#!/bin/sh
THIS_DIR="$( cd "$( dirname "\${BASH_SOURCE[0]}" )" && pwd )"
cd "$THIS_DIR"
./flipper-runtime ./server "$@"
`;

const WINDOWS_STARTUP_SCRIPT = `@echo off
setlocal
set "THIS_DIR=%~dp0"
cd /d "%THIS_DIR%"
flipper-runtime.exe ./server %*
`;

// eslint-disable-next-line node/no-sync
const argv = yargs
  .usage('yarn build-flipper-server [args]')
  .version(false)
  .options({
    'public-build': {
      describe:
        '[FB-internal only] Will force using public sources only, to be able to iterate quickly on the public version. If sources are checked out from GitHub this is already the default. Setting env var "FLIPPER_FORCE_PUBLIC_BUILD" is equivalent.',
      type: 'boolean',
      default: false,
    },
    start: {
      describe:
        'Start flipper-server from the build folder after compiling it.',
      type: 'boolean',
      default: false,
    },
    npx: {
      describe:
        'Install flipper-server to the local system using NPX and start it',
      type: 'boolean',
      default: false,
    },
    open: {
      describe:
        'Open Flipper in the default browser after starting. Should be combined with --start or --npx',
      type: 'boolean',
      default: false,
    },
    'rebuild-plugins': {
      describe:
        'Enables rebuilding of default plugins on Flipper build. Only make sense in conjunction with "--no-bundled-plugins". Enabled by default, but if disabled using "--no-plugin-rebuild", then plugins are just released as is without rebuilding. This can save some time if you know plugin bundles are already up-to-date.',
      type: 'boolean',
      default: true,
    },
    'enabled-plugins': {
      describe:
        'Load only specified plugins and skip loading rest. This is useful when you are developing only one or few plugins. Plugins to load can be specified as a comma-separated list with either plugin id or name used as identifier, e.g. "--enabled-plugins network,inspector". The flag is not provided by default which means that all plugins loaded.',
      type: 'array',
    },
    // options based on build-release
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
    version: {
      description:
        'Unique build identifier to be used as the version patch part for the build',
      type: 'number',
    },
    mac: {
      describe: 'Build arm64 and x64 bundles for MacOS.',
      type: 'boolean',
      default: false,
    },
    'mac-local': {
      describe: 'Build local architecture bundle for MacOS.',
      type: 'boolean',
      default: false,
    },
    win: {
      describe: 'Build a platform-specific bundle for Windows.',
      type: 'boolean',
      default: false,
    },
    linux: {
      describe: 'Build a platform-specific bundle for Linux.',
    },
    dmg: {
      describe: 'Package built server as a DMG file (Only for a MacOS build).',
      type: 'boolean',
      default: false,
    },
  })
  .help()
  .parseSync(process.argv.slice(1));

if (isFB) {
  process.env.FLIPPER_FB = 'true';
}

process.env.FLIPPER_RELEASE_CHANNEL = argv.channel;

if (argv['default-plugins-dir']) {
  process.env.FLIPPER_DEFAULT_PLUGINS_DIR = argv['default-plugins-dir'];
}

if (argv['public-build'] === true) {
  // we use a separate env var for forced_public builds, since
  // FB_FLIPPER / isFB reflects whether we are running on FB sources / infra
  // so changing that will not give the desired result (e.g. incorrect resolve paths, yarn installs)
  // this variable purely overrides whether imports are from `fb` or `fb-stubs`
  console.log('🐬 Emulating open source build of Flipper');
  process.env.FLIPPER_FORCE_PUBLIC_BUILD = 'true';
}

if (argv['enabled-plugins'] !== undefined) {
  process.env.FLIPPER_ENABLED_PLUGINS = argv['enabled-plugins'].join(',');
}

async function copyStaticResources(outDir: string, versionNumber: string) {
  console.log(`⚙️  Copying default plugins...`);

  const plugins = await fs.readdir(defaultPluginsDir);
  for (const plugin of plugins) {
    let source = path.join(defaultPluginsDir, plugin);
    // static/defaultPlugins will symlink, resolve those first
    while ((await fs.lstat(source)).isSymbolicLink()) {
      source = await fs.readlink(source);
    }
    const target = path.join(outDir, 'static', 'defaultPlugins', plugin);
    if ((await fs.stat(source)).isDirectory()) {
      // Verify it safe to strip the package down, does it have the
      // typical flipper plugin structure?
      const packageJson = JSON.parse(
        await fs.readFile(path.join(source, 'package.json'), 'utf8'),
      );
      if (packageJson.main !== 'dist/bundle.js') {
        console.error(
          `Cannot bundle plugin '${source}', the main entry point is '${packageJson.main}', but expected 'dist/bundle.js'`,
        );
        continue;
      }

      // Update version number of the default plugins to prevent them from updating from marketplace
      // Preserve current plugin versions if plugins were previously downloaded from marketplace during the build on Sandcastle.
      // See build-utils:prepareDefaultPlugins
      packageJson.version =
        packageJson.version === '0.0.0' ? versionNumber : packageJson.version;

      // for plugins, only keep package.json & dist, to keep impact minimal
      await fs.copy(path.join(source, 'dist'), path.join(target, 'dist'));
      await fs.writeJSON(path.join(target, 'package.json'), packageJson);
    } else {
      await fs.copy(source, target);
    }
  }

  console.log(`⚙️  Copying package resources...`);

  const packageFilesToCopy = ['README.md', 'server.js', 'lib'];

  await Promise.all(
    packageFilesToCopy.map((e) =>
      fs.copy(path.join(serverDir, e), path.join(outDir, e)),
    ),
  );

  console.log(`⚙️  Copying static resources...`);

  const staticsToCopy = [
    'icons',
    'native-modules',
    'PortForwardingMacApp.app',
    'themes',
    'vis',
    'icon.icns',
    'icon.ico',
    'icon.png',
    'icon_grey.png',
    'icons.json',
    'index.web.html',
    'install_desktop.svg',
    'loading.html',
    'offline.html',
    'service-worker.js',
    'style.css',
  ];
  if (isFB) {
    staticsToCopy.push('facebook');
  }

  await Promise.all(
    staticsToCopy.map((e) =>
      fs.copy(path.join(staticDir, e), path.join(outDir, 'static', e)),
    ),
  );

  // Manifest needs to be copied over to static folder with the correct name.
  await fs.copy(
    path.join(staticDir, 'manifest.template.json'),
    path.join(outDir, 'static', 'manifest.json'),
  );

  console.log('✅  Copied static resources.');
}

async function linkLocalDeps(buildFolder: string) {
  // eslint-disable-next-line no-console
  console.log('Creating package.json manifest to link local deps');
  const manifest = await fs.readJSON(path.resolve(serverDir, 'package.json'));

  const resolutions = {
    ...manifest.resolutions,
    'flipper-doctor': `file:${rootDir}/doctor`,
    'flipper-common': `file:${rootDir}/flipper-common`,
    'flipper-server-client': `file:${rootDir}/flipper-server-client`,
    'flipper-pkg-lib': `file:${rootDir}/pkg-lib`,
    'flipper-plugin-lib': `file:${rootDir}/plugin-lib`,
  };
  manifest.resolutions = resolutions;

  for (const depName in manifest.dependencies) {
    if (depName in resolutions) {
      manifest.dependencies[depName] =
        resolutions[depName as keyof typeof resolutions];
    }
  }

  delete manifest.scripts;

  await fs.writeFile(
    path.join(buildFolder, 'package.json'),
    JSON.stringify(manifest, null, '  '),
  );

  await yarnInstall(buildFolder);

  console.log('✅ Linked local deps');
}

async function modifyPackageManifestForPublishing(
  buildFolder: string,
  versionNumber: string,
  hgRevision: string | null,
  channel: string,
) {
  // eslint-disable-next-line no-console
  console.log('Creating package.json manifest');
  const manifest = await fs.readJSON(path.resolve(serverDir, 'package.json'));

  manifest.version = versionNumber;
  manifest.private = false; // make this package npm-publishable
  if (hgRevision != null) {
    manifest.revision = hgRevision;
  }
  manifest.releaseChannel = channel;
  // not needed in public builds
  delete manifest.scripts;
  delete manifest.devDependencies;

  // update local monorepo dependencies' versions
  // we will need them for npx to work
  for (const depName of Object.keys(manifest.dependencies)) {
    if (depName.startsWith('flipper')) {
      manifest.dependencies[depName] = versionNumber;
    }
  }

  await fs.writeFile(
    path.join(buildFolder, 'package.json'),
    JSON.stringify(manifest, null, '  '),
  );
}

async function packNpmArchive(dir: string, versionNumber: any) {
  console.log(`⚙️  Packing flipper-server.tgz`);
  await fs.mkdirp(distDir);
  const archive = path.resolve(distDir, 'flipper-server.tgz');
  await spawn('yarn', ['pack', '--filename', archive], {
    cwd: dir,
    shell: true,
    stdio: 'inherit',
  });

  console.log(
    `✅  flipper-release-build completed, version ${versionNumber} in ${dir}`,
  );
  return archive;
}

async function runPostBuildAction(archive: string, dir: string) {
  if (argv.npx) {
    // This is a hack, as npx cached very aggressively if package.version
    // didn't change
    console.log(`⚙️  Installing flipper-server.tgz using npx`);
    await fs.remove(path.join(homedir(), '.npm', '_npx'));
    await spawn('npx', [archive, argv.open ? '--open' : '--no-open'], {
      stdio: 'inherit',
      shell: true,
    });
  } else if (argv.start) {
    console.log(`⚙️  Starting flipper-server from build dir`);
    await spawn('./server.js', [argv.open ? '--open' : '--no-open'], {
      cwd: dir,
      stdio: 'inherit',
      shell: true,
    });
  }
}

async function yarnInstall(dir: string) {
  console.log(
    `⚙️  Running yarn install in ${dir}. package.json: ${await fs.readFile(
      path.resolve(dir, 'package.json'),
    )}`,
  );

  await spawn(
    'yarn',
    [
      'install',
      '--production',
      ...(process.env.SANDCASTLE ? ['--offline'] : []),
    ],
    {
      cwd: dir,
      stdio: 'inherit',
      shell: true,
    },
  );
}

async function stripForwardingToolFromArchive(archive: string): Promise<void> {
  // Remove package/static/PortForwardingMacApp.app from the tarball.
  // This is a temporary (Fingers crossed!) hack as npm
  // doesn't allow packages with symlinks in them.
  const tmpDir = await fs.mkdtemp('flipper-server-npm-package-');
  await tar.x({file: archive, cwd: tmpDir});
  await fs.remove(path.join(tmpDir, 'package/static/PortForwardingMacApp.app'));
  await tar.c({file: archive, cwd: tmpDir, gzip: true}, ['.']);
  await fs.remove(tmpDir);
  console.log('✅  Wrote stripped npm archive for flipper-server: ', archive);
}

async function buildServerRelease() {
  console.log(`⚙️  Starting build-flipper-server-release`);
  console.dir(argv);
  const dir = await buildFolder();
  console.log('Created build directory', dir);

  if (dotenv && dotenv.parsed) {
    console.log('✅  Loaded env vars from .env file: ', dotenv.parsed);
  }

  const versionNumber = getVersionNumber(argv.version);
  const hgRevision = await genMercurialRevision();
  console.log(
    `  Building version / revision ${versionNumber} ${hgRevision ?? ''}`,
  );

  // create plugin output dir
  await fs.mkdirp(path.join(dir, 'static', 'defaultPlugins'));

  await prepareDefaultPlugins(argv.channel === 'insiders');
  await compileServerMain();
  await copyStaticResources(dir, versionNumber);
  await linkLocalDeps(dir);
  await downloadIcons(path.join(dir, 'static'));
  await buildBrowserBundle(path.join(dir, 'static'), false);
  await moveServerSourceMaps(dir, argv['source-map-dir']);
  await modifyPackageManifestForPublishing(
    dir,
    versionNumber,
    hgRevision,
    argv.channel,
  );
  const archive = await packNpmArchive(dir, versionNumber);
  await runPostBuildAction(archive, dir);
  await stripForwardingToolFromArchive(archive);

  const platforms: BuildPlatform[] = [];
  if (argv.linux) {
    platforms.push(BuildPlatform.LINUX);
  }
  if (argv.mac) {
    platforms.push(BuildPlatform.MAC_X64);
    platforms.push(BuildPlatform.MAC_AARCH64);
  }
  if (argv.macLocal) {
    const architecture = os.arch();
    console.log(`⚙️  Local architecture: ${architecture}`);
    if (architecture == 'arm64') {
      platforms.push(BuildPlatform.MAC_AARCH64);
    } else {
      platforms.push(BuildPlatform.MAC_X64);
    }
  }
  if (argv.win) {
    platforms.push(BuildPlatform.WINDOWS);
  }

  // Instead of parallel builds, these have to be done sequential.
  // As we are building a native app, the resulting binary will be
  // different per platform meaning that there's a risk of overriding
  // intermediate artefacts if done in parallel.
  for (const platform of platforms) {
    await bundleServerReleaseForPlatform(dir, versionNumber, platform);
  }
}

function nodeArchFromBuildPlatform(platform: BuildPlatform): string {
  if (platform === BuildPlatform.MAC_AARCH64) {
    return 'arm64';
  }
  return 'x64';
}

/**
 * Downloads a file located at the given URL and saves it to the destination path..
 * @param url - URL of the file to download.
 * @param dest - Destination path for the downloaded file.
 * @returns - A promise that resolves when the file is downloaded.
 * If the file can't be downloaded, it rejects with an error.
 */
async function download(url: string, dest: string): Promise<void> {
  // First, check if the file already exists and remove it.
  try {
    await fs.access(dest, fs.constants.F_OK);
    await fs.unlink(dest);
  } catch (err) {}

  return new Promise<void>((resolve, reject) => {
    // Then, download the file and save it to the destination path.
    const file: fs.WriteStream = fs.createWriteStream(dest);
    fetch(url)
      .then((response) => {
        response.body.pipe(file);
        response.body.on('error', (err) => {
          throw err;
        });
        file.on('finish', () => {
          file.close();
          console.log(`✅  Download successful ${url} to ${dest}.`);
          resolve();
        });
      })
      .catch((error: Error) => {
        console.log(`❌  Download failed ${url}. Error: ${error}`);
        fs.unlink(dest);
        reject(error);
      });
  });
}

/**
 * Unpacks a tarball and extracts the contents to a directory.
 * @param source - Source tarball.
 * @param dest - Destination directory for the extracted contents.
 */
async function unpack(source: string, destination: string) {
  console.log(`⚙️  Extracting ${source} to ${destination}.`);

  try {
    await fs.access(destination, fs.constants.F_OK);
    await fs.rm(destination, {recursive: true, force: true});
  } catch (err) {}

  await fs.mkdir(destination);

  try {
    await tar.x({
      file: source,
      strip: 1,
      cwd: destination,
    });

    console.log(`✅  Extraction completed.`);
  } catch (error) {
    console.error(
      `❌  Error found whilst trying to extract '${source}'. Found: ${error}`,
    );
  }
}

function nodePlatformFromBuildPlatform(platform: BuildPlatform): string {
  switch (platform) {
    case BuildPlatform.LINUX:
      return 'linux';
    case BuildPlatform.MAC_X64:
    case BuildPlatform.MAC_AARCH64:
      return 'macos';
    case BuildPlatform.WINDOWS:
      return 'win32';
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

async function setRuntimeAppIcon(binaryPath: string): Promise<void> {
  console.log(`⚙️  Updating runtime icon for MacOS in ${binaryPath}.`);
  const iconPath = path.join(staticDir, 'icon.png');
  const tempRsrcPath = path.join(os.tmpdir(), 'icon.rsrc');
  const deRezCmd = `DeRez -only icns ${iconPath} > ${tempRsrcPath}`;
  try {
    await execAsync(deRezCmd);
  } catch (err) {
    console.error(
      `❌  Error while extracting icon with '${deRezCmd}'. Error: ${err}`,
    );
    throw err;
  }
  const rezCmd = `Rez -append ${tempRsrcPath} -o ${binaryPath}`;
  try {
    await execAsync(rezCmd);
  } catch (err) {
    console.error(
      `❌  Error while setting icon on executable ${binaryPath}. Error: ${err}`,
    );
    throw err;
  }
  const updateCmd = `SetFile -a C ${binaryPath}`;
  try {
    await execAsync(updateCmd);
  } catch (err) {
    console.error(
      `❌  Error while changing icon visibility on ${binaryPath}. Error: ${err}`,
    );
    throw err;
  }
  console.log(`✅  Updated flipper-runtime icon.`);
}

async function installNodeBinary(outputPath: string, platform: BuildPlatform) {
  /**
   * Below is a temporary patch that doesn't use pkg-fetch to
   * download a node binary for macOS arm64.
   * This will be removed once there's a properly
   * signed binary for macOS arm64 architecture.
   */
  if (platform === BuildPlatform.MAC_AARCH64) {
    const temporaryDirectory = os.tmpdir();
    const name = `node-${NODE_VERSION}-darwin-arm64`;
    const downloadOutputPath = path.resolve(
      temporaryDirectory,
      `${name}.tar.gz`,
    );
    const unpackedOutputPath = path.resolve(temporaryDirectory, name);
    let nodePath = path.resolve(unpackedOutputPath, 'bin', 'node');
    console.log(
      `⚙️  Downloading node version for ${platform} using temporary patch.`,
    );

    // Check local cache.
    let cached = false;
    try {
      const cachePath = path.join(homedir(), '.node', name);
      await fs.access(cachePath, fs.constants.F_OK);
      console.log(`⚙️  Cached artifact found, skip download.`);
      nodePath = path.resolve(cachePath, 'bin', 'node');
      cached = true;
    } catch (err) {}
    if (!cached) {
      // Download node tarball from the distribution site.
      // If this is not present (due to a node update) follow these steps:
      // - Update the download URL to `https://nodejs.org/dist/${NODE_VERSION}/${name}.tar.gz`
      // - Ensure the Xcode developer tools are installed
      // - Build a full MacOS server release locally using `yarn build:flipper-server --mac`
      // - Enter the dist folder: dist/flipper-server-mac-aarch64/Flipper.app/Contents/MacOS
      // - `mkdir bin && cp flipper-runtime bin/node && tar -czvf node-${NODE_VERSION}-darwin-arm64.tar.gz bin`
      // - Upload the resulting tar ball to the Flipper release page as a new tag: https://github.com/facebook/flipper/releases
      await download(
        `https://github.com/facebook/flipper/releases/download/node-${NODE_VERSION}/${name}.tar.gz`,
        downloadOutputPath,
      );
      // Finally, unpack the tarball to a local folder i.e. outputPath.
      await unpack(downloadOutputPath, unpackedOutputPath);
      console.log(`✅  Node successfully downloaded and unpacked.`);
    }

    console.log(`⚙️  Moving node binary from ${nodePath} to ${outputPath}`);
    if (await fs.exists(outputPath)) {
      await fs.rm(outputPath);
    }
    await fs.move(nodePath, outputPath);
  } else {
    console.log(`⚙️  Downloading node version for ${platform} using pkg-fetch`);
    const nodePath = await pkgFetch({
      arch: nodeArchFromBuildPlatform(platform),
      platform: nodePlatformFromBuildPlatform(platform),
      nodeRange: SUPPORTED_NODE_PLATFORM,
    });

    console.log(`⚙️  Moving node binary from ${nodePath} to ${outputPath}`);
    if (await fs.exists(outputPath)) {
      await fs.rm(outputPath);
    }
    await fs.move(nodePath, outputPath);
  }

  if (
    platform === BuildPlatform.MAC_AARCH64 ||
    platform === BuildPlatform.MAC_X64
  ) {
    if (process.platform === 'darwin') {
      await setRuntimeAppIcon(outputPath).catch(() => {
        console.warn('⚠️  Unable to update runtime icon');
      });
    } else {
      console.warn("⚠️  Skipping icon update as it's only supported on macOS");
    }
  }

  // Set +x on the binary as copyFile doesn't maintain the bit.
  await fs.chmod(outputPath, 0o755);
}

async function createMacDMG(
  platform: BuildPlatform,
  outputPath: string,
  destPath: string,
) {
  console.log(`⚙️  Create macOS DMG from: ${outputPath}`);

  const name = `Flipper-server-${platform}.dmg`;
  const temporaryDirectory = os.tmpdir();

  const dmgOutputPath = path.resolve(temporaryDirectory, name);

  await fs.remove(dmgOutputPath);

  const dmgPath = path.resolve(destPath, name);

  const cmd = `hdiutil create -format UDZO -srcfolder "${outputPath}/" -volname "Flipper" ${dmgOutputPath}`;

  return new Promise<void>((resolve, reject) => {
    exec(cmd, async (error, _stdout, stderr) => {
      if (error) {
        console.error(`❌  Failed to create DMG with error: ${error.message}`);
        return reject(error);
      }

      if (stderr) {
        console.error(`❌  Failed to create DMG with error: ${stderr}`);
        return reject(new Error(stderr));
      }

      await fs.move(dmgOutputPath, dmgPath);
      await fs.remove(outputPath);

      console.log(`✅  DMG successfully created ${dmgPath}`);
      resolve();
    });
  });
}

async function createTar(
  platform: BuildPlatform,
  outputPath: string,
  destPath: string,
) {
  console.log(`⚙️  Create tar of: ${outputPath}`);

  const name = `flipper-server-${platform}.tar.gz`;
  const temporaryDirectory = os.tmpdir();
  const tempTarPath = path.resolve(temporaryDirectory, name);
  const finalTarPath = path.resolve(destPath, name);

  // Create a tar.gz based on the output path
  await tar.c(
    {
      gzip: true,
      file: tempTarPath,
      cwd: outputPath,
    },
    ['.'],
  );

  await fs.move(tempTarPath, finalTarPath);
  await fs.remove(outputPath);

  console.log(`✅  Tar successfully created: ${finalTarPath}`);
}

async function setUpLinuxBundle(outputDir: string) {
  console.log(`⚙️  Creating Linux startup script in ${outputDir}/flipper`);
  await fs.writeFile(path.join(outputDir, 'flipper'), LINUX_STARTUP_SCRIPT);
  // Give the script +x
  await fs.chmod(path.join(outputDir, 'flipper'), 0o755);
}

async function setUpWindowsBundle(outputDir: string) {
  console.log(`⚙️  Creating Windows bundle in ${outputDir}`);
  await fs.writeFile(
    path.join(outputDir, 'flipper.bat'),
    WINDOWS_STARTUP_SCRIPT,
  );
  // Give the script +x
  await fs.chmod(path.join(outputDir, 'flipper.bat'), 0o755);
}

async function setUpMacBundle(
  outputDir: string,
  serverDir: string,
  platform: BuildPlatform,
  versionNumber: string,
) {
  console.log(`⚙️  Creating Mac bundle in ${outputDir}`);

  let serverOutputDir = '';
  let nodeBinaryFile = '';

  /**
   * Use the most basic template for MacOS.
   * - Copy the contents of the template into the output directory.
   * - Replace the version placeholder value with the actual version.
   */
  if (!isFB) {
    const template = path.join(staticDir, 'flipper-server-app-template');
    await fs.copy(template, outputDir);

    function replacePropertyValue(
      obj: any,
      targetValue: string,
      replacementValue: string,
    ): any {
      if (typeof obj === 'object' && !Array.isArray(obj) && obj !== null) {
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            obj[key] = replacePropertyValue(
              obj[key],
              targetValue,
              replacementValue,
            );
          }
        }
      } else if (typeof obj === 'string' && obj === targetValue) {
        obj = replacementValue;
      }
      return obj;
    }

    console.log(`⚙️  Update plist with build information`);
    const plistPath = path.join(
      outputDir,
      'Flipper.app',
      'Contents',
      'Info.plist',
    );

    /* eslint-disable node/no-sync*/
    const pListContents: Record<any, any> = plist.readFileSync(plistPath);
    replacePropertyValue(
      pListContents,
      '{flipper-server-version}',
      versionNumber,
    );
    plist.writeBinaryFileSync(plistPath, pListContents);
    /* eslint-enable node/no-sync*/

    serverOutputDir = path.join(
      outputDir,
      'Flipper.app',
      'Contents',
      'Resources',
      'server',
    );

    nodeBinaryFile = path.join(
      outputDir,
      'Flipper.app',
      'Contents',
      'MacOS',
      'flipper-runtime',
    );
  } else {
    serverOutputDir = path.join(
      sonarDir,
      'facebook',
      'flipper-server',
      'Resources',
      'server',
    );
    nodeBinaryFile = path.join(
      sonarDir,
      'facebook',
      'flipper-server',
      'Resources',
      'flipper-runtime',
    );
  }

  if (await fs.exists(serverOutputDir)) {
    await fs.rm(serverOutputDir, {recursive: true, force: true});
  }
  await fs.mkdirp(serverOutputDir);

  console.log(`⚙️  Copying from ${serverDir} to ${serverOutputDir}`);

  // Copy resources instead of moving. This is because we want to keep the original
  // files in the right location because they are used whilst bundling for
  // other platforms.
  await fs.copy(serverDir, serverOutputDir, {
    overwrite: true,
    // We need to preserve symlinks, otherwise signing fails for frameworks that use Versions schema
    dereference: false,
  });

  console.log(`⚙️  Downloading compatible node version`);
  await installNodeBinary(nodeBinaryFile, platform);

  if (isFB) {
    const {buildFlipperServer} = await import(
      // @ts-ignore only used inside Meta
      './fb/build-flipper-server-macos'
    );

    const outputPath = await buildFlipperServer(versionNumber, false);
    console.log(
      `⚙️  Successfully built platform: ${platform}, output: ${outputPath}`,
    );

    const appPath = path.join(outputDir, 'Flipper.app');
    await fs.emptyDir(appPath);
    await fs.copy(outputPath, appPath);

    // const appPath = path.join(outputDir, 'Flipper.app');
    // if (await fs.exists(appPath)) {
    //   await fs.rm(appPath, {recursive: true, force: true});
    // }
    // await fs.move(outputPath, appPath);
  }
}

async function bundleServerReleaseForPlatform(
  bundleDir: string,
  versionNumber: string,
  platform: BuildPlatform,
) {
  console.log(`⚙️  Building platform-specific bundle for ${platform}`);
  const outputDir = path.join(
    distDir,
    `flipper-server-${platform.toString().toLocaleLowerCase()}`,
  );
  await fs.mkdirp(outputDir);

  // On the mac, we need to set up a resource bundle which expects paths
  // to be in different places from Linux/Windows bundles.
  if (
    platform === BuildPlatform.MAC_X64 ||
    platform === BuildPlatform.MAC_AARCH64
  ) {
    await setUpMacBundle(outputDir, bundleDir, platform, versionNumber);
    if (argv.dmg) {
      await createMacDMG(platform, outputDir, distDir);
    }
  } else {
    const outputPaths = {
      nodePath: path.join(
        outputDir,
        platform === BuildPlatform.WINDOWS
          ? 'flipper-runtime.exe'
          : 'flipper-runtime',
      ),
      resourcesPath: outputDir,
    };

    if (platform === BuildPlatform.LINUX) {
      await setUpLinuxBundle(outputDir);
      if (argv.tar) {
        await createTar(platform, outputDir, distDir);
      }
    } else if (platform === BuildPlatform.WINDOWS) {
      await setUpWindowsBundle(outputDir);
      if (argv.tar) {
        await createTar(platform, outputDir, distDir);
      }
    }

    console.log(
      `⚙️  Copying from ${bundleDir} to ${outputPaths.resourcesPath}`,
    );
    await fs.copy(bundleDir, outputPaths.resourcesPath, {
      overwrite: true,
      // We need to preserve symlinks, otherwise signing fails for frameworks that use Versions schema
      dereference: false,
    });

    console.log(`⚙️  Downloading compatible node version`);
    await installNodeBinary(outputPaths.nodePath, platform);
  }

  console.log(`✅  Wrote ${platform}-specific server version to ${outputDir}`);
}

buildServerRelease().catch((e) => {
  console.error('Failed to build flipper-server', e, e.stack);
  process.exit(1);
});
