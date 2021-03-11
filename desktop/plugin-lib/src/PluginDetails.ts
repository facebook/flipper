/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export interface PluginDetails {
  name: string;
  specVersion: number;
  version: string;
  source: string;
  main: string;
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
}

export interface SupportedDevice {
  readonly os?: OS;
  readonly type?: DeviceType;
  readonly archived?: boolean;
  readonly specs?: DeviceSpec[];
}

export type OS = 'iOS' | 'Android' | 'Metro';

export type DeviceType = 'emulator' | 'physical' | 'dummy';

export type PluginType = 'client' | 'device';

export type DeviceSpec = 'KaiOS';

export interface ConcretePluginDetails extends PluginDetails {
  // Determines whether the plugin is a part of the Flipper JS bundle.
  isBundled: boolean;
  // Determines whether the plugin is physically available for activation in Flipper.
  isActivatable: boolean;
}

// Describes plugin which is a part of the Flipper JS bundle.
export interface BundledPluginDetails extends ConcretePluginDetails {
  isBundled: true;
  isActivatable: true;
}

// Describes plugin installed on the disk.
export interface InstalledPluginDetails extends ConcretePluginDetails {
  isBundled: false;
  isActivatable: true;
  dir: string;
  entry: string;
}

// Describes plugin physically available for activation in Flipper.
export type ActivatablePluginDetails =
  | BundledPluginDetails
  | InstalledPluginDetails;

// Describes plugin available for downloading. Until downloaded to the disk it is not available for activation in Flipper.
export interface DownloadablePluginDetails extends ConcretePluginDetails {
  isActivatable: false;
  isBundled: false;
  downloadUrl: string;
  lastUpdated: Date;
}

export default PluginDetails;
