/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {default as algoliasearch, SearchIndex} from 'algoliasearch';

const ALGOLIA_APPLICATION_ID = 'OFCNCOG2CU';
const ALGOLIA_API_KEY = 'f54e21fa3a2a0160595bb058179bfb1e';

function provideSearchIndex(): SearchIndex {
  const client = algoliasearch(ALGOLIA_APPLICATION_ID, ALGOLIA_API_KEY);
  return client.initIndex('npm-search');
}

export type NpmPackageDescriptor = {
  name: string;
  version: string;
};

export type NpmHostedPluginsSearchArgs = {
  query?: string;
};

export async function getNpmHostedPlugins(
  args: NpmHostedPluginsSearchArgs = {},
): Promise<NpmPackageDescriptor[]> {
  const index = provideSearchIndex();
  args = Object.assign(
    {
      query: '',
      filters: 'keywords:flipper-plugin',
      hitsPerPage: 50,
    },
    args,
  );
  const {hits} = await index.search<NpmPackageDescriptor>(
    args.query || '',
    args,
  );
  return hits;
}
