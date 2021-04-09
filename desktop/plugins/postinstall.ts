/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {execSync} from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import pmap from 'p-map';

async function postinstall() {
  const publicPluginsDir = path.join(__dirname, 'public');
  execSync('yarn install --mutex network:30330', {
    cwd: publicPluginsDir,
    stdio: 'inherit',
  });
  const fbPluginsDir = path.join(__dirname, 'fb');
  if (await fs.pathExists(fbPluginsDir)) {
    execSync('yarn install --mutex network:30330', {
      cwd: fbPluginsDir,
      stdio: 'inherit',
    });
  }
  const [publicPackages, fbPackages] = await Promise.all([
    fs.readdir(publicPluginsDir),
    fs.readdir(fbPluginsDir).catch(() => [] as string[]),
  ]);
  const packages = [
    ...publicPackages.map((p) => path.join(publicPluginsDir, p)),
    ...fbPackages.map((p) => path.join(fbPluginsDir, p)),
  ];
  const modulesDir = path.join(__dirname, 'node_modules');
  await pmap(packages, async (packageDir) => {
    const packageJsonPath = path.join(packageDir, 'package.json');
    if (!(await fs.pathExists(packageJsonPath))) {
      return;
    }
    const packageJson = await fs.readJson(
      path.join(packageDir, 'package.json'),
    );
    if (
      packageJson.keywords &&
      packageJson.keywords.includes('flipper-plugin')
    ) {
      return;
    }
    const destPath = path.join(modulesDir, packageJson.name);
    console.log(
      `linking ${path.relative(__dirname, destPath)} to ${path.relative(
        __dirname,
        packageDir,
      )}`,
    );
    if (await fs.pathExists(destPath)) {
      return;
    }
    await fs.ensureDir(path.dirname(destPath));
    await fs.symlink(packageDir, destPath, 'junction');
  });
}

postinstall()
  .then(() => {
    process.exit(0);
  })
  .catch((err: any) => {
    console.error(err);
    process.exit(1);
  });
