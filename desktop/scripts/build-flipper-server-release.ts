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
import {serverStaticDir, staticDir} from './paths';
import isFB from './isFB';
import yargs from 'yargs';
import {copy, mkdir, remove} from 'fs-extra';

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
  })
  .version('DEV')
  .help()
  .parse(process.argv.slice(1));

if (isFB) {
  process.env.FLIPPER_FB = 'true';
}

// Don't bundle any plugins into the UI
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

(async () => {
  console.log(`⚙️  Starting build-flipper-server-release`);

  if (dotenv && dotenv.parsed) {
    console.log('✅  Loaded env vars from .env file: ', dotenv.parsed);
  }

  // clear and re-create static dir
  await remove(serverStaticDir);
  await mkdir(serverStaticDir);

  await prepareDefaultPlugins(false);

  await compileServerMain(false);
  await buildBrowserBundle(false);
  await copyStaticResources();

  if (argv.open) {
    await launchServer(false, true);
  }
})().catch((e) => {
  console.error('Failed to build flipper-server', e, e.stack);
  process.exit(1);
});

async function copyStaticResources() {
  console.log(`⚙️  Copying static resources...`);

  // static folder, without the things that are only for Electron
  const thingsToCopy = [
    'defaultPlugins',
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
      copy(path.join(staticDir, e), path.join(serverStaticDir, e)),
    ),
  );
  console.log('✅  Copied static resources.');
}
