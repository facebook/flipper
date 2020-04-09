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
import expandTilde from 'expand-tilde';
import {homedir} from 'os';

const HOME_DIR = homedir();

export type PluginManifest = {
  version: string;
  name: string;
  main?: string;
  bundleMain?: string;
  [key: string]: any;
};

export type PluginInfo = {
  rootDir: string;
  name: string;
  entry: string;
  manifest: PluginManifest;
};

export default function getPluginEntryPoints(additionalPaths: string[] = []) {
  const defaultPluginPath = path.join(HOME_DIR, '.flipper', 'node_modules');
  const entryPoints = entryPointForPluginFolder(defaultPluginPath);
  if (typeof additionalPaths === 'string') {
    additionalPaths = [additionalPaths];
  }
  additionalPaths.forEach((additionalPath) => {
    const additionalPlugins = entryPointForPluginFolder(additionalPath);
    Object.keys(additionalPlugins).forEach((key) => {
      entryPoints[key] = additionalPlugins[key];
    });
  });
  return entryPoints;
}
function entryPointForPluginFolder(pluginPath: string) {
  pluginPath = expandTilde(pluginPath);
  if (!fs.existsSync(pluginPath)) {
    return {};
  }
  return fs
    .readdirSync(pluginPath)
    .filter((name) => fs.lstatSync(path.join(pluginPath, name)).isDirectory())
    .filter(Boolean)
    .map((name) => {
      let packageJSON;
      try {
        packageJSON = fs
          .readFileSync(path.join(pluginPath, name, 'package.json'))
          .toString();
      } catch (e) {}
      if (packageJSON) {
        try {
          const json = JSON.parse(packageJSON);
          if (!json.keywords || !json.keywords.includes('flipper-plugin')) {
            console.log(
              `Skipping package "${json.name}" as its "keywords" field does not contain tag "flipper-plugin"`,
            );
            return null;
          }
          const pkg = json as PluginManifest;
          const plugin: PluginInfo = {
            manifest: pkg,
            name: pkg.name,
            entry: path.join(pluginPath, name, pkg.main || 'index.js'),
            rootDir: path.join(pluginPath, name),
          };
          return plugin;
        } catch (e) {
          console.error(
            `Could not load plugin "${pluginPath}", because package.json is invalid.`,
          );
          console.error(e);
          return null;
        }
      }
      return null;
    })
    .filter(Boolean)
    .reduce<{[key: string]: PluginInfo}>((acc, cv) => {
      acc[cv!.name] = cv!;
      return acc;
    }, {});
}
