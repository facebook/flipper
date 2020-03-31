/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {rootDir, pluginsDir} from './paths';
import fs from 'fs-extra';
import path from 'path';
import {promisify} from 'util';
import globImport from 'glob';
import pfilter from 'p-filter';
import pmap from 'p-map';
const glob = promisify(globImport);

const lastArg = process.argv[process.argv.length - 1];
const version =
  lastArg === __filename ? undefined : process.argv[process.argv.length - 1];

bump(version)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

async function bump(version?: string) {
  const rootPackageJson = await fs.readJson(path.join(rootDir, 'package.json'));
  version = version || (rootPackageJson.version as string);
  const packageGlobs = rootPackageJson.workspaces.packages as string[];
  const localPackages = await pmap(
    await pfilter(
      ([] as string[]).concat(
        ...(await pmap(packageGlobs, (pattern) =>
          glob(path.join(rootDir, pattern, '')),
        )),
      ),
      async (dir) =>
        !dir.startsWith(pluginsDir) &&
        (await fs.pathExists(path.join(dir, 'package.json'))),
    ),
    async (dir) => {
      const json = await fs.readJson(path.join(dir, 'package.json'));
      return {
        dir,
        json,
      };
    },
  );
  const localPackageNames = localPackages.map(({json}) => json.name as string);
  for (const {dir, json} of localPackages) {
    json.version = version;
    if (json.dependencies) {
      for (const localPackageName of localPackageNames) {
        if (json.dependencies[localPackageName] !== undefined) {
          json.dependencies[localPackageName] = version;
        }
      }
    }
    await fs.writeJson(path.join(dir, 'package.json'), json, {
      spaces: 2,
    });
  }
}
