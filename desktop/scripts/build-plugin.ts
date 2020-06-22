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

(async function buildPlugin() {
  const pluginDirArg = process.argv[2];
  const pluginDir = await resolveAbsolutePluginDir(pluginDirArg);
  if (path.relative(pluginsDir, pluginDir).includes('..')) {
    throw new Error(
      `Plugin dir ${pluginDir} is not inside plugins directory ${pluginsDir}`,
    );
  }
  const outputFile = path.join(
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
})();

async function resolveAbsolutePluginDir(dir: string): Promise<string> {
  if (path.isAbsolute(dir)) {
    return dir;
  }
  const resolvedFromPluginDir = path.resolve(pluginsDir, dir);
  if (await fs.pathExists(resolvedFromPluginDir)) {
    return resolvedFromPluginDir;
  }
  const resolvedFromCwd = path.resolve(process.cwd(), dir);
  if (await fs.pathExists(resolvedFromCwd)) {
    return resolvedFromCwd;
  }
  throw new Error(
    `Cannot resolve plugin dir path. Paths checked: ${[
      resolvedFromPluginDir,
      resolvedFromCwd,
    ]}`,
  );
}
