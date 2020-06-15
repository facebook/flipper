/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import fs from 'fs-extra';
import path from 'path';
import ignore from 'ignore';

const DEFAULT_BUILD_IGNORES = [
  '/node_modules',
  'README*',
  'LICENSE*',
  '*.ts',
  '*.ls',
  '*.flow',
  '*.tsbuildinfo',
  '*.map',
  'Gruntfile*',
];

/**
 * This function copies package into the specified target dir with all its dependencies:
 * 1) Both direct and transitive dependencies are copied.
 * 2) Symlinks are dereferenced and copied to the target dir as normal dirs.
 * 3) Hoisting is supported, so the function scans node_modules up the file tree until dependency is resolved.
 * 4) All the dependencies keep their scopes, e.g. dependency from <packageDir>/node_modules/package1/node_modules/package2
 *    is copied to <targetDir>/node_modules/package1/node_modules/package2.
 * 5) Prints informative error and fails fast if a dependency is not resolved.
 */
export default async function copyPackageWithDependencies(
  packageDir: string,
  targetDir: string,
) {
  await fs.remove(targetDir);
  await copyPackageWithDependenciesRecursive(packageDir, targetDir, targetDir);
}

async function copyPackageWithDependenciesRecursive(
  packageDir: string,
  targetDir: string,
  rootTargetDir: string,
) {
  if (await fs.pathExists(targetDir)) {
    return;
  }
  await fs.mkdirp(targetDir);
  if ((await fs.stat(packageDir)).isSymbolicLink()) {
    packageDir = await fs.readlink(packageDir);
  }
  const ignores = await fs
    .readFile(path.join(packageDir, '.buildignore'), 'utf-8')
    .then((l) => l.split('\n'))
    .catch((_e) => [])
    .then((l: Array<string>) => ignore().add(DEFAULT_BUILD_IGNORES.concat(l)));
  await fs.copy(packageDir, targetDir, {
    dereference: true,
    recursive: true,
    filter: (src) => {
      const relativePath = path.relative(packageDir, src);
      return relativePath === '' || !ignores.ignores(relativePath);
    },
  });
  const pkg = await fs.readJson(path.join(packageDir, 'package.json'));
  const dependencies = (pkg.dependencies ?? {}) as {[key: string]: string};
  let unresolvedCount = Object.keys(dependencies).length;
  let curPackageDir = packageDir;
  let curTargetDir = targetDir;
  while (unresolvedCount > 0) {
    const curPackageModulesDir = path.join(curPackageDir, 'node_modules');
    if (await fs.pathExists(curPackageModulesDir)) {
      for (const moduleName of Object.keys(dependencies)) {
        const curModulePath = path.join(
          curPackageModulesDir,
          ...moduleName.split('/'),
        );
        const targetModulePath = path.join(
          curTargetDir,
          'node_modules',
          ...moduleName.split('/'),
        );
        if (await fs.pathExists(curModulePath)) {
          await copyPackageWithDependenciesRecursive(
            curModulePath,
            targetModulePath,
            rootTargetDir,
          );
          delete dependencies[moduleName];
          unresolvedCount--;
        }
      }
    }

    const parentPackageDir = getParentPackageDir(curPackageDir);
    if (
      !parentPackageDir ||
      parentPackageDir === '' ||
      parentPackageDir === curPackageDir
    ) {
      break;
    }
    curPackageDir = parentPackageDir;

    curTargetDir = getParentPackageDir(curTargetDir);
    if (!curTargetDir || curTargetDir.length < rootTargetDir.length) {
      curTargetDir = rootTargetDir;
    }
  }

  if (unresolvedCount > 0) {
    for (const unresolvedDependency of Object.keys(dependencies)) {
      console.error(`Cannot resolve ${unresolvedDependency} in ${packageDir}`);
    }
    process.exit(1);
  }
}

function getParentPackageDir(packageDir: string) {
  packageDir = path.dirname(packageDir);
  while (
    path.basename(packageDir) === 'node_modules' ||
    path.basename(packageDir).startsWith('@')
  ) {
    packageDir = path.dirname(packageDir);
  }
  return packageDir;
}
