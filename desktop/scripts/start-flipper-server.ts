/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import child from 'child_process';
import chalk from 'chalk';
import path from 'path';
import {compileServerMain} from './build-utils';
import Watchman from './watchman';
import {serverDir} from './paths';
import isFB from './isFB';
import yargs from 'yargs';
import open from 'open';

const argv = yargs
  .usage('yarn start [args]')
  .options({
    'default-plugins': {
      describe:
        'Enables embedding of default plugins into Flipper package so they are always available. The flag is enabled by default. Env var FLIPPER_NO_DEFAULT_PLUGINS is equivalent to the command-line option "--no-default-plugins".',
      type: 'boolean',
    },
    'bundled-plugins': {
      describe:
        'Enables bundling of plugins into Flipper bundle. This is useful for debugging, because it makes Flipper dev mode loading faster and unblocks fast refresh. The flag is enabled by default. Env var FLIPPER_NO_BUNDLEDD_PLUGINS is equivalent to the command-line option "--no-bundled-plugins".',
      type: 'boolean',
    },
    'rebuild-plugins': {
      describe:
        'Enables rebuilding of default plugins on Flipper build. Only make sense in conjunction with "--no-bundled-plugins". Enabled by default, but if disabled using "--no-plugin-rebuild", then plugins are just released as is without rebuilding. This can save some time if you know plugin bundles are already up-to-date.',
      type: 'boolean',
    },
    'plugin-marketplace': {
      describe:
        'Enable plugin marketplace - ability to install plugins from NPM or other sources. Without the flag Flipper will only show default plugins. The flag is disabled by default in dev mode. Env var FLIPPER_NO_PLUGIN_MARKETPLACE is equivalent to the command-line option "--no-plugin-marketplace"',
      type: 'boolean',
    },
    'plugin-auto-update-interval': {
      describe:
        '[FB-internal only] Set custom interval in milliseconds for plugin auto-update checks. Env var FLIPPER_PLUGIN_AUTO_UPDATE_POLLING_INTERVAL is equivalent to this command-line option.',
      type: 'number',
    },
    'enabled-plugins': {
      describe:
        'Load only specified plugins and skip loading rest. This is useful when you are developing only one or few plugins. Plugins to load can be specified as a comma-separated list with either plugin id or name used as identifier, e.g. "--enabled-plugins network,inspector". The flag is not provided by default which means that all plugins loaded.',
      type: 'array',
    },
    'public-build': {
      describe:
        '[FB-internal only] Will force using public sources only, to be able to iterate quickly on the public version. If sources are checked out from GitHub this is already the default. Setting env var "FLIPPER_FORCE_PUBLIC_BUILD" is equivalent.',
      type: 'boolean',
    },
    build: {
      describe:
        'Build the server without watching for changing or starting the service',
      type: 'boolean',
    },
    open: {
      describe: 'Open Flipper in the default browser after starting',
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

if (argv['default-plugins'] === true) {
  delete process.env.FLIPPER_NO_DEFAULT_PLUGINS;
} else if (argv['default-plugins'] === false) {
  process.env.FLIPPER_NO_DEFAULT_PLUGINS = 'true';
}

if (argv['bundled-plugins'] === true) {
  delete process.env.FLIPPER_NO_BUNDLED_PLUGINS;
} else if (argv['bundled-plugins'] === false) {
  process.env.FLIPPER_NO_BUNDLED_PLUGINS = 'true';
}

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

// By default plugin marketplace is disabled in dev mode,
// but it is possible to enable it using this command line
// argument or env var.
if (argv['plugin-marketplace'] === true) {
  delete process.env.FLIPPER_NO_PLUGIN_MARKETPLACE;
} else {
  process.env.FLIPPER_NO_PLUGIN_MARKETPLACE = 'true';
}

if (argv['plugin-auto-update-interval']) {
  process.env.FLIPPER_PLUGIN_AUTO_UPDATE_POLLING_INTERVAL = `${argv['plugin-auto-update-interval']}`;
}

if (argv['enabled-plugins'] !== undefined) {
  process.env.FLIPPER_ENABLED_PLUGINS = argv['enabled-plugins'].join(',');
}

let proc: child.ChildProcess | undefined;

function launchServer() {
  console.log('⚙️  Launching flipper-server...');
  proc = child.spawn(
    'node',
    ['--inspect=9229', `../flipper-server/server.js`],
    {
      cwd: serverDir,
      env: {
        ...process.env,
      },
      stdio: 'inherit',
    },
  );
}

async function restartServer() {
  proc?.kill(9);
  try {
    await compileServerMain();
    await launchServer();
  } catch (e) {
    console.error(
      chalk.red(
        'Failed to compile or launch server, waiting for additional changes...',
      ),
      e,
    );
  }
}

async function startWatchChanges() {
  try {
    const watchman = new Watchman(path.resolve(__dirname, '..'));
    await watchman.initialize();
    await Promise.all(
      [
        'pkg',
        'doctor',
        'plugin-lib',
        'flipper-server',
        'flipper-common',
        'flipper-server-core',
      ].map((dir) =>
        watchman.startWatchFiles(
          dir,
          () => {
            restartServer();
          },
          {
            excludes: [
              '**/__tests__/**/*',
              '**/node_modules/**/*',
              '**/.*',
              '**/lib/**/*',
              '**/dist/**/*',
            ],
          },
        ),
      ),
    );
  } catch (err) {
    console.error('Failed to start watching for changes using Watchman', err);
  }
}

(async () => {
  if (argv['build']) {
    await compileServerMain();
  } else {
    await startWatchChanges();
    // builds and starts
    await restartServer();

    if (argv.open) {
      setTimeout(() => {
        // TODO: make port configurable together with flipper-server
        open('http://localhost:52342/index.web.dev.html');
      }, 2000);
    }
  }
})();
