/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

/*
 * This file is intentionally separate from androidContainerUtility so the
 * opaque types will ensure the commands are only ever run on validated
 * arguments.
 */
import {UnsupportedError} from './metrics';
import adbkit, {Client} from 'adbkit';

const allowedAppNameRegex = /^[a-zA-Z0-9._\-]+$/;
const appNotDebuggableRegex = /debuggable/;
const operationNotPermittedRegex = /not permitted/;
const logTag = 'androidContainerUtility';

export type AppName = string;
export type Command = string;
export type FilePath = string;
export type FileContent = string;

export function validateAppName(app: string): Promise<AppName> {
  if (app.match(allowedAppNameRegex)) {
    return Promise.resolve(app);
  }
  return Promise.reject(new Error(`Disallowed run-as user: ${app}`));
}

export function validateFilePath(filePath: string): Promise<FilePath> {
  if (!filePath.match(/[']/)) {
    return Promise.resolve(filePath);
  }
  return Promise.reject(new Error(`Disallowed escaping filepath: ${filePath}`));
}

export function validateFileContent(content: string): Promise<FileContent> {
  if (!content.match(/["]/)) {
    return Promise.resolve(content);
  }
  return Promise.reject(
    new Error(`Disallowed escaping file content: ${content}`),
  );
}

export function _push(
  client: Client,
  deviceId: string,
  app: AppName,
  filename: FilePath,
  contents: FileContent,
): Promise<void> {
  console.debug(`Deploying ${filename} to ${deviceId}:${app}`, logTag);
  return executeCommandAsApp(
    client,
    deviceId,
    app,
    `echo "${contents}" > '${filename}' && chmod 644 '${filename}'`,
  ).then(_ => undefined);
}

export function _pull(
  client: Client,
  deviceId: string,
  app: AppName,
  path: FilePath,
): Promise<string> {
  return executeCommandAsApp(client, deviceId, app, `cat '${path}'`);
}

// Keep this method private since it relies on pre-validated arguments
function executeCommandAsApp(
  client: Client,
  deviceId: string,
  app: string,
  command: string,
): Promise<string> {
  return client
    .shell(deviceId, `echo '${command}' | run-as '${app}'`)
    .then(adbkit.util.readAll)
    .then(buffer => buffer.toString())
    .then(output => {
      if (output.match(appNotDebuggableRegex)) {
        throw new Error(
          `Android app ${app} is not debuggable. To use it with Flipper, add android:debuggable="true" to the application section of AndroidManifest.xml`,
        );
      }
      if (output.toLowerCase().match(operationNotPermittedRegex)) {
        throw new UnsupportedError(
          `Your android device (${deviceId}) does not support the adb shell run-as command. We're tracking this at https://github.com/facebook/flipper/issues/92`,
        );
      }
      return output;
    });
}
