/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import PluginDetails from './PluginDetails';
import {getInstalledPlugins} from './getInstalledPlugins';
import semver from 'semver';
import {getNpmHostedPlugins, NpmPackageDescriptor} from './getNpmHostedPlugins';
import NpmApi from 'npm-api';
import getPluginDetails from './getPluginDetails';
import {getPluginInstallationDir} from './pluginInstaller';
import pmap from 'p-map';
import {notNull} from './typeUtils';

export type UpdateResult =
  | {kind: 'not-installed'; version: string}
  | {kind: 'pending'}
  | {kind: 'up-to-date'}
  | {kind: 'error'; error: Error}
  | {kind: 'update-available'; version: string};

export type UpdatablePlugin = {
  updateStatus: UpdateResult;
};

export type UpdatablePluginDetails = PluginDetails & UpdatablePlugin;

export async function getUpdatablePlugins(): Promise<UpdatablePluginDetails[]> {
  const npmApi = new NpmApi();
  const installedPlugins = await getInstalledPlugins();
  const npmHostedPlugins = new Map<string, NpmPackageDescriptor>(
    (await getNpmHostedPlugins()).map((p) => [p.name, p]),
  );
  const annotatedInstalledPlugins = await pmap(
    installedPlugins,
    async (installedPlugin): Promise<UpdatablePluginDetails> => {
      try {
        const npmPackageDescriptor = npmHostedPlugins.get(installedPlugin.name);
        if (npmPackageDescriptor) {
          npmHostedPlugins.delete(installedPlugin.name);
          if (
            semver.lt(installedPlugin.version, npmPackageDescriptor.version)
          ) {
            const pkg = await npmApi.repo(npmPackageDescriptor.name).package();
            const npmPluginDetails = await getPluginDetails(
              getPluginInstallationDir(npmPackageDescriptor.name),
              pkg,
            );
            return {
              ...npmPluginDetails,
              updateStatus: {
                kind: 'update-available',
                version: npmPluginDetails.version,
              },
            };
          }
        }
        const updateStatus: UpdateResult =
          installedPlugin.installationStatus === 'installed'
            ? {kind: 'up-to-date'}
            : {kind: 'pending'};
        return {
          ...installedPlugin,
          updateStatus,
        };
      } catch (error) {
        return {
          ...installedPlugin,
          updateStatus: {
            kind: 'error',
            error,
          },
        };
      }
    },
    {
      concurrency: 4,
    },
  );
  const annotatedNotInstalledPlugins = await pmap(
    npmHostedPlugins.values(),
    async (notInstalledPlugin) => {
      try {
        const pkg = await npmApi.repo(notInstalledPlugin.name).package();
        const npmPluginDetails = await getPluginDetails(
          getPluginInstallationDir(notInstalledPlugin.name),
          pkg,
        );
        return {
          ...npmPluginDetails,
          updateStatus: {
            kind: 'not-installed',
            version: npmPluginDetails.version,
          },
        } as UpdatablePluginDetails;
      } catch (error) {
        console.log(
          `Failed to load details from npm for plugin ${notInstalledPlugin.name}`,
        );
        return null;
      }
    },
    {
      concurrency: 4,
    },
  );
  return [
    ...annotatedInstalledPlugins.sort((p1, p2) =>
      p1.name.localeCompare(p2.name),
    ),
    ...annotatedNotInstalledPlugins
      .filter(notNull)
      .sort((p1, p2) => p1.name.localeCompare(p2.name)),
  ];
}
