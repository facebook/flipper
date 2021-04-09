/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {rootDir, pluginsDir, fbPluginsDir, publicPluginsDir} from './paths';
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
  isPrivate: boolean;
  isPlugin: boolean;
}

export interface Workspaces {
  rootPackage: Package;
  packages: Package[];
}

async function getWorkspacesByRoot(
  rootDir: string,
): Promise<Workspaces | null> {
  if (!(await fs.pathExists(path.join(rootDir, 'package.json')))) {
    return null;
  }
  const rootPackageJson = await fs.readJson(path.join(rootDir, 'package.json'));
  const packageGlobs = rootPackageJson.workspaces.packages as string[];
  const packages = await pmap(
    await pfilter(
      ([] as string[]).concat(
        ...(await pmap(packageGlobs, (pattern) =>
          glob(path.join(rootDir, pattern, '')),
        )),
      ),
      async (dir) => await fs.pathExists(path.join(dir, 'package.json')),
    ),
    async (dir) => {
      const json = await fs.readJson(path.join(dir, 'package.json'));
      return {
        dir,
        json,
        isPrivate: json.private || dir.startsWith(pluginsDir),
        isPlugin:
          json.keywords &&
          Array.isArray(json.keywords) &&
          json.keywords.includes('flipper-plugin'),
      };
    },
  );
  return {
    rootPackage: {
      dir: rootDir,
      json: rootPackageJson,
      isPrivate: true,
      isPlugin: false,
    },
    packages,
  };
}

export async function getWorkspaces(): Promise<Workspaces> {
  const rootWorkspaces = await getWorkspacesByRoot(rootDir);
  const publicPluginsWorkspaces = await getWorkspacesByRoot(publicPluginsDir);
  const fbPluginsWorkspaces = await getWorkspacesByRoot(fbPluginsDir);
  const mergedWorkspaces: Workspaces = {
    rootPackage: rootWorkspaces!.rootPackage,
    packages: [
      ...rootWorkspaces!.packages,
      ...publicPluginsWorkspaces!.packages,
      ...(fbPluginsWorkspaces ? fbPluginsWorkspaces.packages : []),
    ],
  };
  return mergedWorkspaces;
}

export async function bumpVersions({
  newVersion,
  dryRun,
}: {
  newVersion?: string;
  dryRun?: boolean;
}) {
  return await bumpWorkspaceVersions(await getWorkspaces(), newVersion, dryRun);
}

async function savePackageJson({dir, json}: Package) {
  await fs.writeJson(path.join(dir, 'package.json'), json, {
    spaces: 2,
  });
}

function updateDependencies(
  name: string,
  dependencies: {[key: string]: string},
  packagesToUpdate: string[],
  newVersion: string,
): boolean {
  if (!dependencies) {
    return false;
  }
  let updated = false;
  for (const packageName of packagesToUpdate) {
    if (
      dependencies[packageName] !== undefined &&
      dependencies[packageName] !== newVersion
    ) {
      console.log(
        `Updated dependency of ${name}: ${packageName} from version ${dependencies[packageName]} to version ${newVersion}`,
      );
      dependencies[packageName] = newVersion;
      updated = true;
    }
  }
  return updated;
}

async function bumpWorkspaceVersions(
  {rootPackage, packages}: Workspaces,
  newVersion?: string,
  dryRun?: boolean,
): Promise<string> {
  newVersion = newVersion || (rootPackage.json.version as string);
  const allPackages = [rootPackage, ...packages];
  const localPackageNames = packages.map(({json}) => json.name as string);
  for (const pkg of allPackages) {
    const {json} = pkg;
    let changed = false;
    if (json.version && json.version !== newVersion) {
      console.log(
        `Bumping version of ${json.name} from ${json.version} to ${newVersion}`,
      );
      json.version = newVersion;
      changed = true;
    }
    if (
      updateDependencies(
        json.name,
        json.dependencies,
        localPackageNames,
        newVersion,
      )
    ) {
      changed = true;
    }
    if (
      updateDependencies(
        json.name,
        json.devDependencies,
        localPackageNames,
        newVersion,
      )
    ) {
      changed = true;
    }
    if (
      updateDependencies(
        json.name,
        json.peerDependencies,
        localPackageNames,
        newVersion,
      )
    ) {
      changed = true;
    }
    if (changed) {
      if (dryRun) {
        console.log(
          `DRYRUN: skipping saving changed package.json for ${pkg.json.name}`,
        );
      } else {
        console.log(`Saving changed package.json for ${pkg.json.name}`);
        await savePackageJson(pkg);
      }
    }
  }
  return newVersion;
}

export async function publishPackages({
  newVersion,
  proxy,
  dryRun,
}: {
  newVersion?: string;
  proxy?: string;
  dryRun?: boolean;
}) {
  const workspaces = await getWorkspaces();
  const version = await bumpWorkspaceVersions(workspaces, newVersion, dryRun);
  let cmd = `yarn publish --new-version ${version}`;
  if (proxy) {
    cmd += ` --http-proxy ${proxy} --https-proxy ${proxy}`;
  }
  const publicPackages = workspaces.packages.filter((pkg) => !pkg.isPrivate);
  for (const pkg of publicPackages) {
    if (dryRun) {
      console.log(`DRYRUN: Skipping npm publishing for ${pkg.json.name}`);
    } else {
      console.log(`Publishing ${pkg.json.name}...`);
      execSync(cmd, {cwd: pkg.dir, stdio: 'inherit'});
    }
  }
}

export async function resolvePluginDir(name: string): Promise<string> {
  const pluginDir =
    (await resolvePluginByNameOrId(name)) ?? (await resolvePluginByPath(name));
  if (!pluginDir) {
    throw new Error(`Cannot find plugin by name or dir ${name}`);
  } else {
    return pluginDir;
  }
}

async function resolvePluginByNameOrId(
  pluginName: string,
): Promise<string | undefined> {
  const workspaces = await getWorkspaces();
  const pluginDir = workspaces.packages
    .filter((p) => p.isPlugin)
    .find(
      (p) =>
        p.json.name === pluginName ||
        p.json.id === pluginName ||
        p.json.name === `flipper-plugin-${pluginName}`,
    )?.dir;
  return pluginDir;
}

async function resolvePluginByPath(dir: string): Promise<string | undefined> {
  if (path.isAbsolute(dir)) {
    if (await fs.pathExists(dir)) {
      return dir;
    } else {
      return undefined;
    }
  }
  const resolvedFromPluginDir = path.resolve(pluginsDir, dir);
  if (await fs.pathExists(resolvedFromPluginDir)) {
    return resolvedFromPluginDir;
  }
  const resolvedFromCwd = path.resolve(process.cwd(), dir);
  if (await fs.pathExists(resolvedFromCwd)) {
    return resolvedFromCwd;
  }
  return undefined;
}
