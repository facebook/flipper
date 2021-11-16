/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  ActivatablePluginDetails,
  DownloadablePluginDetails,
} from 'flipper-plugin-lib';

export function createMockDownloadablePluginDetails(
  params: {
    id?: string;
    name?: string;
    version?: string;
    title?: string;
    flipperEngineVersion?: string;
    downloadUrl?: string;
    gatekeeper?: string;
    lastUpdated?: Date;
  } = {},
): DownloadablePluginDetails {
  const {id, version, title, flipperEngineVersion, gatekeeper, lastUpdated} = {
    id: 'test',
    version: '3.0.1',
    flipperEngineVersion: '0.46.0',
    lastUpdated: new Date(1591226525 * 1000),
    ...params,
  };
  const lowercasedID = id.toLowerCase();
  const name = params.name || `flipper-plugin-${lowercasedID}`;
  const details: DownloadablePluginDetails = {
    name: name || `flipper-plugin-${lowercasedID}`,
    id: id,
    bugs: {
      email: 'bugs@localhost',
      url: 'bugs.localhost',
    },
    category: 'tools',
    description: 'Description of Test Plugin',
    flipperSDKVersion: flipperEngineVersion,
    engines: {
      flipper: flipperEngineVersion,
    },
    gatekeeper: gatekeeper ?? `GK_${lowercasedID}`,
    icon: 'internet',
    main: 'dist/bundle.js',
    source: 'src/index.tsx',
    specVersion: 2,
    pluginType: 'client',
    title: title ?? id,
    version: version,
    downloadUrl: `http://localhost/${lowercasedID}/${version}`,
    lastUpdated: lastUpdated,
    isBundled: false,
    isActivatable: false,
  };
  return details;
}

export function createMockActivatablePluginDetails(
  base: Partial<ActivatablePluginDetails>,
): ActivatablePluginDetails {
  return {
    id: 'Hello',
    specVersion: 2,
    isBundled: false,
    isActivatable: true,
    dir: '/Users/mock/.flipper/thirdparty/flipper-plugin-sample1',
    entry: './test/index.js',
    name: 'flipper-plugin-hello',
    version: '0.1.0',
    pluginType: 'client',
    source: 'src/index.js',
    main: 'dist/bundle.js',
    title: 'Hello',
    ...base,
  };
}
