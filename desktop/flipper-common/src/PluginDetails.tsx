/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {DeviceType, OS} from './server-types';

export interface PluginDetails {
  name: string;
  specVersion: number;
  version: string;
  source: string;
  main: string;
  serverAddOnSource?: string;
  serverAddOn?: string;
  id: string;
  gatekeeper?: string;
  title: string;
  icon?: string;
  description?: string;
  category?: string;
  engines?: {
    [name: string]: string;
  };
  bugs?: {
    email?: string;
    url?: string;
  };
  flipperSDKVersion?: string;
  pluginType?: PluginType;
  supportedDevices?: SupportedDevice[];
  supportedApps?: SupportedApp[];
  publishedDocs?: {
    overview?: boolean;
    setup?: boolean;
  };
  /**
   * Provided by NPM. Allows developers to deprecated packages. Its value is the deprecation reason.
   * Alternatively, might be a part of the plugin's package JSON. In this case, the plugin is excluded from bundling.
   */
  deprecated?: string;
}

export interface SupportedDevice {
  readonly os?: OS;
  readonly type?: DeviceType;
  readonly archived?: boolean;
  readonly specs?: DeviceSpec[];
}

export interface SupportedApp {
  readonly appID?: string;
  readonly os?: OS;
  readonly type?: DeviceType;
}

export type PluginType = 'client' | 'device';

export type DeviceSpec = 'KaiOS';

export interface ConcretePluginDetails extends PluginDetails {
  // Determines whether the plugin is physically available for activation in Flipper.
  isActivatable: boolean;
}

// Describes plugin installed on the disk.
export interface InstalledPluginDetails extends ConcretePluginDetails {
  isActivatable: true;
  dir: string;
  entry: string;
  serverAddOnEntry?: string;
}

// Describes plugin physically available for activation in Flipper.
export type ActivatablePluginDetails = InstalledPluginDetails;

// Describes plugin available for downloading. Until downloaded to the disk it is not available for activation in Flipper.
export interface DownloadablePluginDetails extends ConcretePluginDetails {
  isActivatable: false;
  buildId: string;
  downloadUrls: string[];
  lastUpdated: Date;
  // Indicates whether plugin should be enabled by default for new users
  isEnabledByDefault: boolean;
}

export interface MarketplacePluginDetails extends DownloadablePluginDetails {
  availableVersions?: DownloadablePluginDetails[];
}

export type UpdateResult =
  | {kind: 'not-installed'; version: string}
  | {kind: 'up-to-date'}
  | {kind: 'error'; error: Error}
  | {kind: 'update-available'; version: string};

export type UpdatablePlugin = {
  updateStatus: UpdateResult;
};

export type UpdatablePluginDetails = InstalledPluginDetails & UpdatablePlugin;

export function getPluginDetails(packageJson: any): PluginDetails {
  const specVersion =
    packageJson.$schema &&
    packageJson.$schema ===
      'https://fbflipper.com/schemas/plugin-package/v2.json'
      ? 2
      : 1;
  switch (specVersion) {
    case 1:
      return getPluginDetailsV1(packageJson);
    case 2:
      return getPluginDetailsV2(packageJson);
    default:
      throw new Error(`Unknown plugin format version: ${specVersion}`);
  }
}

// Plugins packaged using V1 are distributed as sources and compiled in run-time.
function getPluginDetailsV1(packageJson: any): PluginDetails {
  return {
    specVersion: 1,
    name: packageJson.name,
    version: packageJson.version,
    main: 'dist/bundle.js',
    source: packageJson.main,
    id: packageJson.name,
    gatekeeper: packageJson.gatekeeper,
    icon: packageJson.icon,
    title: packageJson.title || packageJson.name,
    description: packageJson.description,
    category: packageJson.category,
    bugs: packageJson.bugs,
    flipperSDKVersion: packageJson?.peerDependencies?.['flipper-plugin'],
    pluginType: packageJson?.pluginType,
    supportedDevices: packageJson?.supportedDevices,
    supportedApps: packageJson?.supportedApps,
    engines: packageJson.engines,
    deprecated: packageJson.deprecated,
  };
}

// Plugins packaged using V2 are pre-bundled, so compilation in run-time is not required for them.
function getPluginDetailsV2(packageJson: any): PluginDetails {
  return {
    specVersion: 2,
    name: packageJson.name,
    version: packageJson.version,
    main: packageJson.main,
    serverAddOn: packageJson.serverAddOn,
    source: packageJson.flipperBundlerEntry,
    serverAddOnSource: packageJson.flipperBundlerEntryServerAddOn,
    id: packageJson.id || packageJson.name,
    gatekeeper: packageJson.gatekeeper,
    icon: packageJson.icon,
    title:
      packageJson.title || packageJson.id || getTitleFromName(packageJson.name),
    description: packageJson.description,
    category: packageJson.category,
    bugs: packageJson.bugs,
    flipperSDKVersion: packageJson?.peerDependencies?.['flipper-plugin'],
    pluginType: packageJson?.pluginType,
    supportedDevices: packageJson?.supportedDevices,
    supportedApps: packageJson?.supportedApps,
    engines: packageJson.engines,
    publishedDocs: packageJson.publishedDocs,
    deprecated: packageJson.deprecated,
  };
}

function getTitleFromName(name: string): string {
  const prefix = 'flipper-plugin-';
  if (name.startsWith(prefix)) {
    return name.substr(prefix.length);
  }
  return name;
}

export function isPluginJson(packageJson: any): boolean {
  return packageJson?.keywords?.includes('flipper-plugin');
}
