/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import path from 'path';
import fs from 'fs-extra';
import {getInstalledPluginDetails} from 'flipper-plugin-lib';
import {kebabCase} from 'lodash';

export default async function (
  dir: string,
  options: {
    noDependencies?: boolean;
    noScripts?: boolean;
  } = {},
): Promise<string | undefined> {
  const {noDependencies, noScripts} = Object.assign(
    {
      noDependencies: false,
      noScripts: false,
    },
    options,
  );
  if (!(await fs.pathExists(dir))) {
    return `Directory not found: ${dir}`;
  }
  const packageJsonPath = path.join(dir, 'package.json');
  if (!(await fs.pathExists(packageJsonPath))) {
    return `package.json not found: ${packageJsonPath}`;
  }
  console.log(`⚙️  Migrating Flipper plugin package in ${dir}`);
  const packageJsonString = (await fs.readFile(packageJsonPath)).toString();
  const packageJson = JSON.parse(packageJsonString);
  const pluginDetails = await getInstalledPluginDetails(dir, packageJson);
  if (pluginDetails.specVersion === 2) {
    console.log(
      `✅  Plugin is already defined according to the latest specification version.`,
    );
    return;
  }
  const name = pluginDetails.name.startsWith('flipper-plugin-')
    ? pluginDetails.name
    : `flipper-plugin-${kebabCase(pluginDetails.name)}`;
  const keys = Object.keys(packageJson);
  packageJson.name = name;
  packageJson.main = pluginDetails.main;
  if (!packageJson.flipperBundlerEntry) {
    const index = keys.indexOf('main');
    keys.splice(index + 1, 0, 'flipperBundlerEntry');
  }
  packageJson.flipperBundlerEntry = pluginDetails.source;
  if (!packageJson.id) {
    const index = keys.indexOf('name');
    keys.splice(index + 1, 0, 'id');
  }
  packageJson.id = pluginDetails.id;
  if (!packageJson.$schema) {
    keys.unshift('$schema');
  }
  packageJson.$schema = 'https://fbflipper.com/schemas/plugin-package/v2.json';
  if (!packageJson.keywords) {
    keys.push('keywords');
  }
  if (
    !packageJson.keywords ||
    !packageJson.keywords.includes('flipper-plugin')
  ) {
    packageJson.keywords = ['flipper-plugin', ...(packageJson.keywords || [])];
  }

  if (!noDependencies) {
    const dependenciesFieldIndex = keys.indexOf('dependencies');
    if (packageJson.dependencies && packageJson.dependencies.flipper) {
      delete packageJson.dependencies.flipper;
    }
    if (!packageJson.peerDependencies) {
      if (dependenciesFieldIndex === -1) {
        keys.push('peerDependencies');
      } else {
        if (Object.keys(packageJson.dependencies).length === 0) {
          // If no other dependencies except 'flipper' then we need to remove 'dependencies' and add 'peerDependencies' instead
          keys.splice(dependenciesFieldIndex, 1, 'peerDependencies');
        } else {
          // If there are other dependencies except 'flipper', then
          keys.splice(dependenciesFieldIndex + 1, 0, 'peerDependencies');
        }
      }
    }
    packageJson.peerDependencies = {
      ...packageJson.peerDependencies,
      flipper: 'latest',
    };
    if (!packageJson.devDependencies) {
      const peerDependenciesFieldIndex = keys.indexOf('peerDependencies');
      keys.splice(peerDependenciesFieldIndex + 1, 0, 'devDependencies');
    }
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      flipper: 'latest',
      'flipper-pkg': 'latest',
    };
  }

  if (!noScripts) {
    if (!packageJson.scripts) {
      keys.push('scripts');
    }
    packageJson.scripts = {
      ...packageJson.scripts,
      prepack:
        (packageJson.scripts?.prepack
          ? packageJson.scripts!.prepack! + ' && '
          : '') + 'flipper-pkg lint && flipper-pkg bundle',
    };
  }

  const newPackageJson = keys.reduce<any>((result, key) => {
    result[key] = packageJson[key];
    return result;
  }, {});
  const newPackageJsonString = JSON.stringify(newPackageJson, undefined, 2);
  await fs.writeFile(packageJsonPath, newPackageJsonString);
  console.log(`✅  Plugin migrated to the latest specification version 2.`);
}
