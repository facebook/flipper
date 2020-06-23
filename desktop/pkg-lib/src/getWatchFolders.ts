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

// This function searches all the folders which can be used to
// resolve dependencies for package located in "packageDir", including
// all its transitive dependencies. It scans all the parent directories
// up the file tree and grabs all "node_modules" inside these directories.
// Aditionally, it resolves all the symlinks found in any of these "node_modules"
// directories and repeat the same process for each resolved target directory.
export default async (packageDir: string): Promise<string[]> => {
  if (!(await fs.pathExists(packageDir))) {
    return [];
  }
  const packagesToProcess = [packageDir];
  const processedPackages = new Set<string>();
  processedPackages.add(packageDir);
  const watchDirs = new Set<string>();
  while (packagesToProcess.length > 0) {
    let currentDir = packagesToProcess.shift() as string;
    watchDirs.add(currentDir);
    const {dependencies} = await fs.readJson(
      path.join(currentDir, 'package.json'),
    );
    const dependenciesSet = new Set<string>(Object.keys(dependencies ?? {}));
    while (dependenciesSet.size > 0) {
      const nodeModulesDir = path.join(currentDir, 'node_modules');
      if (await fs.pathExists(nodeModulesDir)) {
        watchDirs.add(nodeModulesDir);
        for (const moduleName of dependenciesSet) {
          const fullModulePath = path.join(nodeModulesDir, moduleName);
          if (await fs.pathExists(fullModulePath)) {
            dependenciesSet.delete(moduleName);
            const stat = await fs.lstat(fullModulePath);
            if (stat.isSymbolicLink()) {
              const targetDir = await fs.readlink(fullModulePath);
              const absoluteTargetDir = path.isAbsolute(targetDir)
                ? targetDir
                : path.resolve(nodeModulesDir, targetDir);
              if (!processedPackages.has(absoluteTargetDir)) {
                packagesToProcess.push(absoluteTargetDir);
                processedPackages.add(absoluteTargetDir);
              }
            }
          }
        }
      }
      const parentDir = path.dirname(currentDir);
      if (!parentDir || parentDir === '/' || parentDir === currentDir) {
        break;
      }
      currentDir = parentDir;
    }
  }
  return [...watchDirs];
};
