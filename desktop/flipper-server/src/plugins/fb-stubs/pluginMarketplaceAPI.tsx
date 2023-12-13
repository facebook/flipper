/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {FlipperServer, MarketplacePluginDetails} from 'flipper-common';
import fetch from 'node-fetch';
import {default as axios, AxiosRequestConfig, AxiosResponse} from 'axios';
import report from '../../utils/requestReport';

export async function loadAvailablePlugins(
  server: FlipperServer,
  marketplaceURL: string,
): Promise<MarketplacePluginDetails[]> {
  try {
    const response = await fetch(marketplaceURL);
    const plugins = await response.json();
    return plugins;
  } catch (e) {
    console.error('Failed while retrieving marketplace plugins', e);
    return [];
  }
}

// Adapter which forces node.js implementation for axios instead of browser implementation
const axiosHttpAdapter = require('axios/lib/adapters/http'); // eslint-disable-line import/no-commonjs

export async function httpGet(
  url: URL,
  config: AxiosRequestConfig,
): Promise<AxiosResponse> {
  return report(
    'plugin-download',
    axios.get(url.toString(), {
      adapter: axiosHttpAdapter,
      responseType: 'stream',
      headers: {
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-Mode': 'navigate',
      },
      ...config,
    }),
  );
}
