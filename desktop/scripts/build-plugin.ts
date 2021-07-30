/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {pluginsDir, distDir, rootDir} from './paths';
import path from 'path';
import fs from 'fs-extra';
import {resolvePluginDir} from './workspaces';
import {runBuild, computePackageChecksum} from 'flipper-pkg-lib';
import yargs from 'yargs';
import tmp from 'tmp';
import {execSync} from 'child_process';

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
    'min-flipper-version': {
      description: 'Minimum Flipper version required for plugin',
      type: 'string',
      alias: 'mfv',
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
    'output-unpacked': {
      description: 'Where to save the unpacked plugin package',
      type: 'string',
      alias: 'ou',
    },
    'output-sourcemap': {
      description: 'File path for the sourcemap to be written. Optional.',
      type: 'string',
      alias: 'os',
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
  const outputUnpackedArg = argv['output-unpacked'];
  const minFlipperVersion = argv['min-flipper-version'];
  const outputSourcemapArg = argv['output-sourcemap'];
  const packageJsonPath = path.join(pluginDir, 'package.json');
  const packageJsonOverridePath = path.join(pluginDir, 'fb', 'package.json');
  await runBuild(pluginDir, false, {sourceMapPath: outputSourcemapArg});
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
    const outputUnpackedDir = outputUnpackedArg
      ? path.resolve(outputUnpackedArg)
      : path.join(distDir, 'plugins', path.relative(pluginsDir, pluginDir));
    await fs.ensureDir(path.dirname(outputFile));
    await fs.remove(outputFile);
    const {name: tmpDir} = tmp.dirSync();
    const packageJsonBackupPath = path.join(tmpDir, 'package.json');
    await fs.copy(packageJsonPath, packageJsonBackupPath, {overwrite: true});
    try {
      const packageJsonOverride = (await fs.pathExists(packageJsonOverridePath))
        ? await fs.readJson(packageJsonOverridePath)
        : {};
      const packageJson = Object.assign(
        await fs.readJson(packageJsonPath),
        packageJsonOverride,
      );
      if (minFlipperVersion) {
        if (!packageJson.engines) {
          packageJson.engines = {};
        }
        packageJson.engines.flipper = minFlipperVersion;
      }
      packageJson.version = argv.version;
      if (await fs.pathExists(path.join(pluginDir, 'docs', 'overview.mdx'))) {
        packageJson.publishedDocs = packageJson.publishedDocs ?? {};
        packageJson.publishedDocs.overview = true;
      }
      if (await fs.pathExists(path.join(pluginDir, 'docs', 'setup.mdx'))) {
        packageJson.publishedDocs = packageJson.publishedDocs ?? {};
        packageJson.publishedDocs.setup = true;
      }
      await fs.writeJson(packageJsonPath, packageJson, {spaces: 2});
      const packCmd = `yarn pack --cwd "${pluginDir}" --filename ${outputFile}`;
      execSync(packCmd, {cwd: rootDir, stdio: 'inherit'});
      await fs.remove(outputUnpackedDir);
      await fs.copy(pluginDir, outputUnpackedDir, {overwrite: true});
      console.log(`Unpacked package saved to ${outputUnpackedDir}`);
    } finally {
      await fs.move(packageJsonBackupPath, packageJsonPath, {overwrite: true});
      await fs.remove(tmpDir);
    }
    await fs.writeFile(outputFile + '.hash', checksum);
  }
}

buildPlugin()
  .then(() => {
    process.exit(0);
  })
  .catch((err: any) => {
    console.error(`Error while building plugin ${argv.plugin}`, err);
    process.exit(1);
  });
