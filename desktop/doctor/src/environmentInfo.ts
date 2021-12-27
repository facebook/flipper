/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {run} from 'envinfo';
import type {FlipperDoctor} from 'flipper-common';

async function retrieveAndParseEnvInfo(): Promise<any> {
  return JSON.parse(
    await run(
      {
        SDKs: ['iOS SDK'],
        IDEs: ['Xcode'],
      },
      {json: true, showNotFound: true},
    ),
  );
}

export async function getEnvInfo(): Promise<FlipperDoctor.EnvironmentInfo> {
  return await retrieveAndParseEnvInfo();
}
