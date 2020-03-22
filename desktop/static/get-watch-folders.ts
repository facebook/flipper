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

export default async (packageDir: string) => {
  const watchDirs: string[] = [packageDir];
  const pkg = await fs.readJson(path.join(packageDir, 'package.json'));
  while (true) {
    const nodeModulesDir = path.join(packageDir, 'node_modules');
    if (await fs.pathExists(nodeModulesDir)) {
      watchDirs.push(nodeModulesDir);
      const modules = await fs.readdir(nodeModulesDir);
      for (const moduleName of modules) {
        if (pkg.dependencies && pkg.dependencies[moduleName]) {
          const fullPath = path.join(nodeModulesDir, moduleName);
          const stat = await fs.lstat(fullPath);
          if (stat.isSymbolicLink()) {
            const target = await fs.readlink(fullPath);
            watchDirs.push(path.resolve(nodeModulesDir, target));
          }
        }
      }
    }
    if (packageDir === '/') {
      break;
    }
    packageDir = path.dirname(packageDir);
  }
  return watchDirs;
};
