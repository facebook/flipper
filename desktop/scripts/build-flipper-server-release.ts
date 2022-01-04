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
} from './build-utils';
import {defaultPluginsDir, distDir, serverDir, staticDir} from './paths';
import isFB from './isFB';
import yargs from 'yargs';
import fs from 'fs-extra';
import {downloadIcons} from './build-icons';
import {spawn} from 'promisify-child-process';
import {homedir} from 'os';

const argv = yargs
  .usage('yarn build-flipper-server [args]')
  .version(false)
  .options({
    'default-plugins': {
      describe:
        'Enables embedding of default plugins into Flipper package so they are always available. The flag is enabled by default. Env var FLIPPER_NO_DEFAULT_PLUGINS is equivalent to the command-line option "--no-default-plugins".',
      type: 'boolean',
      default: true,
    },
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
    version: {
      description:
        'Unique build identifier to be used as the version patch part for the build',
      type: 'number',
    },
  })
  .help()
  .strict()
  .parse(process.argv.slice(1));

if (isFB) {
  process.env.FLIPPER_FB = 'true';
}

process.env.FLIPPER_RELEASE_CHANNEL = argv.channel;

process.env.FLIPPER_NO_BUNDLED_PLUGINS = 'true';

// Don't rebuild default plugins, mostly to speed up testing
if (argv['rebuild-plugins'] === false) {
  process.env.FLIPPER_NO_REBUILD_PLUGINS = 'true';
} else if (argv['rebuild-plugins'] === true) {
  delete process.env.FLIPPER_NO_REBUILD_PLUGINS;
}

if (argv['public-build'] === true) {
  // we use a separate env var for forced_public builds, since
  // FB_FLIPPER / isFB reflects whether we are running on FB sources / infra
  // so changing that will not give the desired result (e.g. incorrect resolve paths, yarn installs)
  // this variable purely overrides whether imports are from `fb` or `fb-stubs`
  console.log('🐬 Emulating open source build of Flipper');
  process.env.FLIPPER_FORCE_PUBLIC_BUILD = 'true';
} else if (argv['public-build'] === false) {
  delete process.env.FLIPPER_FORCE_PUBLIC_BUILD;
}

if (argv['enabled-plugins'] !== undefined) {
  process.env.FLIPPER_ENABLED_PLUGINS = argv['enabled-plugins'].join(',');
}

if (argv['default-plugins-dir']) {
  process.env.FLIPPER_DEFAULT_PLUGINS_DIR = argv['default-plugins-dir'];
}

async function copyStaticResources(outDir: string) {
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

      // for plugins, only copy package.json & dist, to keep impact minimal
      await fs.copy(
        path.join(source, 'package.json'),
        path.join(target, 'package.json'),
      );
      await fs.copy(path.join(source, 'dist'), path.join(target, 'dist'));
    } else {
      await fs.copy(source, target);
    }
  }

  console.log(`⚙️  Copying package resources...`);

  // static folder, without the things that are only for Electron
  const packageFilesToCopy = ['README.md', 'package.json', 'server.js', 'dist'];

  await Promise.all(
    packageFilesToCopy.map((e) =>
      fs.copy(path.join(serverDir, e), path.join(outDir, e)),
    ),
  );

  console.log(`⚙️  Copying static resources...`);

  // static folder, without the things that are only for Electron
  const staticsToCopy = [
    'facebook',
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
    'style.css',
  ];

  await Promise.all(
    staticsToCopy.map((e) =>
      fs.copy(path.join(staticDir, e), path.join(outDir, 'static', e)),
    ),
  );
  console.log('✅  Copied static resources.');
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
  const manifest = require('../flipper-server/package.json');

  manifest.version = versionNumber;
  manifest.private = false; // make this package npm-publishable
  if (hgRevision != null) {
    manifest.revision = hgRevision;
  }
  manifest.releaseChannel = channel;
  // not needed in public builds
  delete manifest.scripts;
  delete manifest.devDependencies;
  await fs.writeFile(
    path.join(buildFolder, 'package.json'),
    JSON.stringify(manifest, null, '  '),
  );
}

(async () => {
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

  // create static dir
  await fs.mkdirp(path.join(dir, 'static', 'defaultPlugins'));

  await prepareDefaultPlugins(argv.channel === 'insiders');
  await compileServerMain(false);
  await buildBrowserBundle(path.join(dir, 'static'), false);
  await copyStaticResources(dir);
  await downloadIcons(path.join(dir, 'static'));
  await modifyPackageManifest(dir, versionNumber, hgRevision, argv.channel);

  console.log(`⚙️  Packing flipper-server.tgz`);
  const archive = path.resolve(distDir, 'flipper-server.tgz');
  await spawn('yarn', ['pack', '--filename', archive], {
    cwd: dir,
    stdio: 'inherit',
  });

  console.log(
    `✅  flipper-release-build completed, version ${versionNumber} in ${dir}`,
  );

  if (argv.npx) {
    // This is a hack, as npx cached very aggressively if package.version
    // didn't change

    console.log(`⚙️  Installing flipper-server.tgz using npx`);
    await fs.remove(path.join(homedir(), '.npm', '_npx'));
    await spawn('npx', [archive, argv.open ? '--open' : '--no-open'], {
      stdio: 'inherit',
    });
  } else if (argv.start) {
    console.log(`⚙️  Starting flipper-server from build dir`);
    await spawn('yarn', ['install', '--production', '--no-lockfile'], {
      cwd: dir,
    });
    await spawn('./server.js', [argv.open ? '--open' : '--no-open'], {
      cwd: dir,
      stdio: 'inherit',
    });
  }
})().catch((e) => {
  console.error('Failed to build flipper-server', e, e.stack);
  process.exit(1);
});
