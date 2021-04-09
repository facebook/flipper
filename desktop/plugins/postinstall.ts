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

const publicPluginsDir = path.join(__dirname, 'public');
const rootDir = path.resolve(__dirname, '..');
const fbPluginsDir = path.join(__dirname, 'fb');

async function postinstall(): Promise<number> {
  const [publicPackages, fbPackages, pluginsPackageJson] = await Promise.all([
    fs.readdir(publicPluginsDir),
    fs.readdir(fbPluginsDir).catch(() => [] as string[]),
    fs.readJson(path.join(__dirname, 'package.json')),
  ]);
  const peerDependencies = pluginsPackageJson.peerDependencies ?? {};
  const packages = [
    ...publicPackages.map((p) => path.join(publicPluginsDir, p)),
    ...fbPackages.map((p) => path.join(fbPluginsDir, p)),
  ];
  const errors: string[] = [];
  const modulesDir = path.join(__dirname, 'node_modules');
  await pmap(
    packages,
    async (packageDir) => {
      const packageJsonPath = path.join(packageDir, 'package.json');
      if (!(await fs.pathExists(packageJsonPath))) {
        return;
      }
      const packageJson = await fs.readJson(
        path.join(packageDir, 'package.json'),
      );
      const allDependencies = Object.assign(
        {},
        packageJson.optionalDependencies ?? {},
        packageJson.devDependencies ?? {},
        packageJson.dependencies ?? {},
      );
      for (const dependency of Object.keys(allDependencies)) {
        if (peerDependencies[dependency]) {
          errors.push(
            `[ERROR] Dependency "${dependency}" in plugin package "${path.relative(
              rootDir,
              packageDir,
            )}" must be specified as peer dependency, because it is provided by Flipper.`,
          );
        }
      }
      if (
        packageJson.keywords &&
        packageJson.keywords.includes('flipper-plugin')
      ) {
        return;
      }
      const destPath = path.join(modulesDir, packageJson.name);
      if (await fs.pathExists(destPath)) {
        await fs.remove(destPath);
      } else {
        await fs.ensureDir(path.dirname(destPath));
      }
      await fs.symlink(packageDir, destPath, 'junction');
    },
    {
      concurrency: 4,
    },
  );
  if (errors.length) {
    console.error('');
    for (const err of errors) {
      console.error(err);
    }
    return 1;
  }
  execSync('yarn install --mutex network:30330', {
    cwd: publicPluginsDir,
    stdio: 'inherit',
  });
  if (await fs.pathExists(fbPluginsDir)) {
    execSync('yarn install --mutex network:30330', {
      cwd: fbPluginsDir,
      stdio: 'inherit',
    });
  }
  const peerDependenciesArray = Object.keys(peerDependencies);
  await Promise.all([
    removeInstalledModules(modulesDir, peerDependenciesArray),
    removeInstalledModules(
      path.join(publicPluginsDir, 'node_modules'),
      peerDependenciesArray,
    ),
    removeInstalledModules(
      path.join(fbPluginsDir, 'node_modules'),
      peerDependenciesArray,
    ),
  ]);
  await pmap(
    packages,
    async (packageDir) => {
      await removeInstalledModules(
        path.join(packageDir, 'node_modules'),
        peerDependenciesArray,
      );
    },
    {concurrency: 4},
  );

  return 0;
}

async function removeInstalledModules(dir: string, modules: string[]) {
  await pmap(
    modules,
    async (d) => {
      const fullPath = path.join(dir, d);
      if (await fs.pathExists(fullPath)) {
        await fs.remove(path.join(dir, d));
      }
    },
    {concurrency: 1},
  );
}

postinstall()
  .then((code) => {
    process.exit(code);
  })
  .catch((err: any) => {
    console.error(err);
    process.exit(1);
  });
