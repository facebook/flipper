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

export function push(
  client: Client,
  deviceId: string,
  app: string,
  filepath: string,
  contents: string,
): Promise<void> {
  return validateAppName(app).then((validApp) =>
    validateFilePath(filepath).then((validFilepath) =>
      validateFileContent(contents).then((validContent) =>
        _push(client, deviceId, validApp, validFilepath, validContent),
      ),
    ),
  );
}

export function pull(
  client: Client,
  deviceId: string,
  app: string,
  path: string,
): Promise<string> {
  return validateAppName(app).then((validApp) =>
    validateFilePath(path).then((validPath) =>
      _pull(client, deviceId, validApp, validPath),
    ),
  );
}
