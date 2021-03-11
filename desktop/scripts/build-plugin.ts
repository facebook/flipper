/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {pluginsDir, rootDir, distDir} from './paths';
import path from 'path';
import fs from 'fs-extra';
import {execSync} from 'child_process';
import {resolvePluginDir} from './workspaces';
import {runBuild, computePackageChecksum} from 'flipper-pkg-lib';
import yargs from 'yargs';

const argv = yargs
  .usage('yarn build-plugin [args]')
  .version(false)
  .options({
    plugin: {
      description:
        'Plugin ID or path relative to "plugins" dir (e.g. "layout")',
      type: 'string',
      demandOption: true,
      alias: 'p',
    },
    version: {
      description: 'New version to set',
      type: 'string',
      alias: 'v',
    },
    checksum: {
      description:
        'Checksum of the previous plugin package which is used to determine whether the plugin is changed or not. If it is not changed, it will not be packaged.',
      type: 'string',
      alias: 'c',
    },
    output: {
      description: 'Where to save the plugin package',
      type: 'string',
      alias: 'o',
    },
  })
  .help()
  .strict()
  .parse(process.argv.slice(1));

async function buildPlugin() {
  const pluginName = argv.plugin;
  const previousChecksum = argv.checksum;
  const pluginDir = await resolvePluginDir(pluginName);
  const outputFileArg = argv.output;
  await runBuild(pluginDir, false);
  const checksum = await computePackageChecksum(pluginDir);
  if (previousChecksum !== checksum && argv.version) {
    console.log(`Plugin changed. Packaging new version ${argv.version}...`);
    const outputFile = outputFileArg
      ? path.resolve(outputFileArg)
      : path.join(
          distDir,
          'plugins',
          path.relative(pluginsDir, pluginDir) + '.tgz',
        );
    await fs.ensureDir(path.dirname(outputFile));
    await fs.remove(outputFile);
    const versionCmd = `yarn version --cwd "${pluginDir}" --new-version ${argv.version}`;
    execSync(versionCmd, {cwd: rootDir, stdio: 'inherit'});
    const packCmd = `yarn pack --cwd "${pluginDir}" --filename ${outputFile}`;
    execSync(packCmd, {cwd: rootDir, stdio: 'inherit'});
    await fs.writeFile(outputFile + '.hash', checksum);
  }
}

buildPlugin()
  .then(() => {
    process.exit(0);
  })
  .catch((err: any) => {
    console.error(err);
    process.exit(1);
  });
