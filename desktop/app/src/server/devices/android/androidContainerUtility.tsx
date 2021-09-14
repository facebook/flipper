/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  validateAppName,
  validateFilePath,
  validateFileContent,
  _push,
  _pull,
} from './androidContainerUtilityInternal';
import {Client} from 'adbkit';

export async function push(
  client: Client,
  deviceId: string,
  app: string,
  filepath: string,
  contents: string,
): Promise<void> {
  const validApp = await validateAppName(app);
  const validFilepath = await validateFilePath(filepath);
  const validContent = await validateFileContent(contents);
  return await _push(client, deviceId, validApp, validFilepath, validContent);
}

export async function pull(
  client: Client,
  deviceId: string,
  app: string,
  path: string,
): Promise<string> {
  const validApp = await validateAppName(app);
  const validPath = await validateFilePath(path);
  return await _pull(client, deviceId, validApp, validPath);
}
