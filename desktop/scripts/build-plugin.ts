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

async function buildPlugin(argv: string[]) {
  const pluginName = argv[2];
  const pluginDir = await resolvePluginDir(pluginName);
  const outputFileArg = argv.length > 3 ? argv[3] : null;
  const outputFile = outputFileArg
    ? path.resolve(outputFileArg)
    : path.join(
        distDir,
        'plugins',
        path.relative(pluginsDir, pluginDir) + '.tgz',
      );
  await fs.ensureDir(path.dirname(outputFile));
  await fs.remove(outputFile);
  const bundleCmd = `yarn flipper-pkg bundle "${pluginDir}" --production`;
  const packCmd = `yarn pack --cwd "${pluginDir}" --filename ${outputFile}`;
  execSync(bundleCmd, {cwd: rootDir, stdio: 'inherit'});
  execSync(packCmd, {cwd: rootDir, stdio: 'inherit'});
}

buildPlugin(process.argv)
  .then(() => {
    process.exit(0);
  })
  .catch((err: any) => {
    console.error(err);
    process.exit(1);
  });
