/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {GraphFileUpload, GraphResponse} from 'flipper-common';

/* eslint-disable @typescript-eslint/no-unused-vars */

export async function internGraphPOSTAPIRequest(
  endpoint: string,
  formFields: {
    [key: string]: any;
  },
  fileFields: Record<string, GraphFileUpload>,
  options: {
    timeout?: number;
    internGraphUrl?: string;
    headers?: Record<string, string | number | boolean>;
    vpnMode?: 'vpn' | 'vpnless';
  },
  token: string,
): Promise<GraphResponse> {
  throw new Error('Feature not implemented');
}

export async function internGraphGETAPIRequest(
  endpoint: string,
  params: {
    [key: string]: any;
  },
  _options: {
    timeout?: number;
    internGraphUrl?: string;
    headers?: Record<string, string | number | boolean>;
    vpnMode?: 'vpn' | 'vpnless';
  },
  token: string,
): Promise<GraphResponse> {
  throw new Error('Feature not implemented');
}
