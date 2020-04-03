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
import {execSync} from 'child_process';
const glob = promisify(globImport);

export interface Package {
  dir: string;
  json: any;
}

export interface Workspaces {
  rootPackage: Package;
  packages: Package[];
}

export async function getWorkspaces(): Promise<Workspaces> {
  const rootPackageJson = await fs.readJson(path.join(rootDir, 'package.json'));
  const packageGlobs = rootPackageJson.workspaces.packages as string[];
  const packages = await pmap(
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
  return {
    rootPackage: {
      dir: rootDir,
      json: rootPackageJson,
    },
    packages,
  };
}

export async function bumpVersions({newVersion}: {newVersion?: string}) {
  return await bumpWorkspaceVersions(await getWorkspaces(), newVersion);
}

async function savePackageJson({dir, json}: Package) {
  await fs.writeJson(path.join(dir, 'package.json'), json, {
    spaces: 2,
  });
}

async function bumpWorkspaceVersions(
  {rootPackage, packages}: Workspaces,
  newVersion?: string,
): Promise<string> {
  newVersion = newVersion || (rootPackage.json.version as string);
  if (rootPackage.json.version !== newVersion) {
    rootPackage.json.version = newVersion;
    await savePackageJson(rootPackage);
  }
  const localPackageNames = packages.map(({json}) => json.name as string);
  for (const pkg of packages) {
    const json = pkg.json;
    let changed = false;
    if (json.version !== newVersion) {
      json.version = newVersion;
      changed = true;
    }
    if (json.dependencies) {
      for (const localPackageName of localPackageNames) {
        if (
          json.dependencies[localPackageName] !== undefined &&
          json.dependencies[localPackageName] !== newVersion
        ) {
          json.dependencies[localPackageName] = newVersion;
          changed = true;
        }
      }
    }
    if (changed) {
      await savePackageJson(pkg);
    }
  }
  return newVersion;
}

export async function publishPackages({
  newVersion,
  proxy,
}: {
  newVersion?: string;
  proxy?: string;
}) {
  const workspaces = await getWorkspaces();
  const version = await bumpWorkspaceVersions(workspaces, newVersion);
  let cmd = `yarn publish --new-version ${version}`;
  if (proxy) {
    cmd += ` --http-proxy ${proxy} --https-proxy ${proxy}`;
  }
  const publicPackages = workspaces.packages.filter((pkg) => !pkg.json.private);
  for (const pkg of publicPackages) {
    execSync(cmd, {cwd: pkg.dir, stdio: 'inherit'});
  }
}
