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
} from './paths';
import isFB from './isFB';
import yargs from 'yargs';
import fs from 'fs-extra';
import {downloadIcons} from './build-icons';
import {spawn} from 'promisify-child-process';
import {homedir} from 'os';
import {need as pkgFetch} from 'pkg-fetch';

// This needs to be tested individually. As of 2022Q2, node17 is not supported.
const SUPPORTED_NODE_PLATFORM = 'node16';

enum BuildPlatform {
  LINUX = 'linux',
  WINDOWS = 'windows',
  MAC_X64 = 'mac-x64',
  MAC_AARCH64 = 'mac-aarch64',
}

const LINUX_STARTUP_SCRIPT = `#!/bin/sh
THIS_DIR="$( cd "$( dirname "\${BASH_SOURCE[0]}" )" && pwd )"
cd "$THIS_DIR"
./node ./server "$@"
`;

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
    tcp: {
      describe: 'Enable TCP connections on flipper-server.',
      type: 'boolean',
      default: true,
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
    // On intern we ship flipper-server with node_modules (no big internet behind the firewall). yarn.lock makes sure that a CI that builds flipper-server installs the same dependencies all the time.
    'generate-lock': {
      describe:
        'Generate a new yarn.lock file for flipper-server prod build. It is used for reproducible builds of the final artifact for the intern.',
      type: 'boolean',
      default: false,
    },
    mac: {
      describe: 'Build a platform-specific bundle for MacOS.',
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
  })
  .help()
  .parse(process.argv.slice(1));

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

  // static folder, without the things that are only for Electron
  const packageFilesToCopy = ['README.md', 'server.js', 'lib'];

  await Promise.all(
    packageFilesToCopy.map((e) =>
      fs.copy(path.join(serverDir, e), path.join(outDir, e)),
    ),
  );

  console.log(`⚙️  Copying static resources...`);

  // static folder, without the things that are only for Electron
  const staticsToCopy = [
    'icons',
    'native-modules',
    'PortForwardingMacApp.app',
    'themes',
    'vis',
    'icon.icns',
    'icon.ico',
    'icon.png',
    'icons.json',
    'index.web.dev.html',
    'index.web.html',
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
    'flipper-doctor': `file:${rootDir}/doctor`,
    'flipper-common': `file:${rootDir}/flipper-common`,
    'flipper-frontend-core': `file:${rootDir}/flipper-frontend-core`,
    'flipper-plugin-core': `file:${rootDir}/flipper-plugin-core`,
    'flipper-server-client': `file:${rootDir}/flipper-server-client`,
    'flipper-server-companion': `file:${rootDir}/flipper-server-companion`,
    'flipper-server-core': `file:${rootDir}/flipper-server-core`,
    'flipper-pkg-lib': `file:${rootDir}/pkg-lib`,
    'flipper-plugin-lib': `file:${rootDir}/plugin-lib`,
  };
  manifest.resolutions = resolutions;

  for (const depName of Object.keys(manifest.dependencies)) {
    if (depName in resolutions) {
      manifest.dependencies[depName] =
        resolutions[depName as keyof typeof resolutions];
    }
  }

  delete manifest.scripts;
  delete manifest.devDependencies;

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
    await spawn(
      'npx',
      [
        archive,
        argv.open ? '--open' : '--no-open',
        argv.tcp ? '--tcp' : '--no-tcp',
      ],
      {
        stdio: 'inherit',
      },
    );
  } else if (argv.start) {
    console.log(`⚙️  Starting flipper-server from build dir`);
    await spawn(
      './server.js',
      [argv.open ? '--open' : '--no-open', argv.tcp ? '--tcp' : '--no-tcp'],
      {
        cwd: dir,
        stdio: 'inherit',
      },
    );
  }
}

async function yarnInstall(dir: string) {
  console.log(
    `⚙️  Running yarn install in ${dir}. package.json: ${await fs.readFile(
      path.resolve(dir, 'package.json'),
    )}`,
  );

  if (!argv['generate-lock']) {
    await fs.copyFile(
      path.resolve(rootDir, 'yarn.flipper-server.lock'),
      path.resolve(dir, 'yarn.lock'),
    );
  }

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
    },
  );

  if (argv['generate-lock']) {
    await fs.copyFile(
      path.resolve(dir, 'yarn.lock'),
      path.resolve(rootDir, 'yarn.flipper-server.lock'),
    );
  }

  await fs.rm(path.resolve(dir, 'yarn.lock'));
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
  await compileServerMain(false);
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

  const platforms: BuildPlatform[] = [];
  if (argv.linux) {
    platforms.push(BuildPlatform.LINUX);
  }
  if (argv.mac) {
    platforms.push(BuildPlatform.MAC_X64);
    platforms.push(BuildPlatform.MAC_AARCH64);
  }
  if (argv.win) {
    platforms.push(BuildPlatform.WINDOWS);
  }

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

async function installNodeBinary(outputPath: string, platform: BuildPlatform) {
  console.log(`⚙️  Downloading node version for ${platform} using pkg-fetch`);
  const path = await pkgFetch({
    arch: nodeArchFromBuildPlatform(platform),
    platform: nodePlatformFromBuildPlatform(platform),
    nodeRange: SUPPORTED_NODE_PLATFORM,
  });
  console.log(`⚙️  Copying node binary from ${path} to ${outputPath}`);
  await fs.copyFile(path, outputPath);
  // Set +x on the binary as copyFile doesn't maintain the bit.
  await fs.chmod(outputPath, 0o755);
}

async function setUpLinuxBundle(outputDir: string) {
  console.log(`⚙️  Creating Linux startup script in ${outputDir}/flipper`);
  await fs.writeFile(path.join(outputDir, 'flipper'), LINUX_STARTUP_SCRIPT);
  // Give the script +x
  await fs.chmod(path.join(outputDir, 'flipper'), 0o755);
}

async function setUpMacBundle(
  outputDir: string,
  versionNumber: string,
): Promise<{nodePath: string; resourcesPath: string}> {
  console.log(`⚙️  Creating Mac bundle in ${outputDir}`);
  await fs.copy(path.join(staticDir, 'flipper-server-app-template'), outputDir);

  console.log(`⚙️  Writing plist`);
  const pListPath = path.join(
    outputDir,
    'Flipper.app',
    'Contents',
    'Info.plist',
  );
  const pListContents = await fs.readFile(pListPath, 'utf-8');
  const updatedPlistContents = pListContents.replace(
    '{flipper-server-version}',
    versionNumber,
  );
  await fs.writeFile(pListPath, updatedPlistContents, 'utf-8');

  const resourcesOutputDir = path.join(
    outputDir,
    'Flipper.app',
    'Contents',
    'Resources',
    'server',
  );
  const nodeOutputPath = path.join(
    outputDir,
    'Flipper.app',
    'Contents',
    'MacOS',
    'node',
  );
  return {resourcesPath: resourcesOutputDir, nodePath: nodeOutputPath};
}

async function bundleServerReleaseForPlatform(
  dir: string,
  versionNumber: string,
  platform: BuildPlatform,
) {
  console.log(`⚙️  Building platform-specific bundle for ${platform}`);
  const outputDir = path.join(
    distDir,
    `flipper-server-${platform.toString().toLocaleLowerCase()}`,
  );
  await fs.mkdirp(outputDir);

  let outputPaths = {
    nodePath: path.join(outputDir, 'node'),
    resourcesPath: outputDir,
  };

  // On the mac, we need to set up a resource bundle which expects paths
  // to be in different places from Linux/Windows bundles.
  if (
    platform === BuildPlatform.MAC_X64 ||
    platform === BuildPlatform.MAC_AARCH64
  ) {
    outputPaths = await setUpMacBundle(outputDir, versionNumber);
  } else if (platform === BuildPlatform.LINUX) {
    await setUpLinuxBundle(outputDir);
  }

  console.log(`⚙️  Copying from ${dir} to ${outputPaths.resourcesPath}`);
  await fs.copy(dir, outputPaths.resourcesPath);

  console.log(`⚙️  Downloading compatible node version`);
  await installNodeBinary(outputPaths.nodePath, platform);

  console.log(`✅  Wrote ${platform}-specific server version to ${outputDir}`);
}

buildServerRelease().catch((e) => {
  console.error('Failed to build flipper-server', e, e.stack);
  process.exit(1);
});
