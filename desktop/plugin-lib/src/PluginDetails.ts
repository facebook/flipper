/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

export interface PluginDetails {
  dir: string;
  name: string;
  specVersion: number;
  version: string;
  source: string;
  main: string;
  id: string;
  isDefault: boolean;
  entry: string;
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
}

export interface DownloadablePluginDetails extends PluginDetails {
  downloadUrl: string;
  lastUpdated: Date;
}

export default PluginDetails;
