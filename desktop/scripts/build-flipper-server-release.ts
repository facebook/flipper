/**
 * Copyright (c) Facebook, Inc. and its affiliates.
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
  compileServerMain,
  launchServer,
  prepareDefaultPlugins,
} from './build-utils';
import {
  defaultPluginsDir,
  serverDefaultPluginsDir,
  serverStaticDir,
  staticDir,
} from './paths';
import isFB from './isFB';
import yargs from 'yargs';
import fs from 'fs-extra';
import {downloadIcons} from './build-icons';

const argv = yargs
  .usage('yarn build-flipper-server [args]')
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
    open: {
      describe: 'Open Flipper in the default browser after starting',
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
  })
  .version('DEV')
  .help()
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

(async () => {
  console.log(`⚙️  Starting build-flipper-server-release`);

  if (dotenv && dotenv.parsed) {
    console.log('✅  Loaded env vars from .env file: ', dotenv.parsed);
  }

  // clear and re-create static dir
  await fs.remove(serverStaticDir);
  await fs.mkdir(serverStaticDir);

  await prepareDefaultPlugins(argv.channel === 'insiders');

  await compileServerMain(false);
  await buildBrowserBundle(false);
  await copyStaticResources();
  await downloadIcons(serverStaticDir);

  if (argv.open) {
    await launchServer(false, true);
  }
})().catch((e) => {
  console.error('Failed to build flipper-server', e, e.stack);
  process.exit(1);
});

async function copyStaticResources() {
  console.log(`⚙️  Copying default plugins...`);
  await fs.mkdirp(serverDefaultPluginsDir);
  const plugins = await fs.readdir(defaultPluginsDir);
  for (const plugin of plugins) {
    let source = path.join(defaultPluginsDir, plugin);
    // static/defaultPlugins will symlink, resolve those first
    while ((await fs.lstat(source)).isSymbolicLink()) {
      source = await fs.readlink(source);
    }
    const target = path.join(serverDefaultPluginsDir, plugin);
    if ((await fs.stat(source)).isDirectory()) {
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

  console.log(`⚙️  Copying static resources...`);

  // static folder, without the things that are only for Electron
  const thingsToCopy = [
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
    'package.json',
    'style.css',
  ];

  await Promise.all(
    thingsToCopy.map((e) =>
      fs.copy(path.join(staticDir, e), path.join(serverStaticDir, e)),
    ),
  );
  console.log('✅  Copied static resources.');
}
