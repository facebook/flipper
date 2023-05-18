/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {UnsupportedError} from 'flipper-common';
import adbkit, {DeviceClient} from '@u4/adbkit';

const allowedAppNameRegex = /^[\w.-]+$/;
const appNotApplicationRegex = /not an application/;
const appNotDebuggableRegex = /debuggable/;
const operationNotPermittedRegex = /not permitted/;
const permissionDeniedRegex = /permission denied/;
const logTag = 'androidContainerUtility';

export type AppName = string;
export type Command = string;
export type FilePath = string;
export type FileContent = string;

export async function push(
  client: DeviceClient,
  deviceId: string,
  app: string,
  filepath: string,
  contents: string,
): Promise<void> {
  validateAppName(app);
  validateFilePath(filepath);
  validateFileContent(contents);
  return await _push(client, deviceId, app, filepath, contents);
}

export async function pull(
  client: DeviceClient,
  deviceId: string,
  app: string,
  path: string,
): Promise<string> {
  validateAppName(app);
  validateFilePath(path);
  return await _pull(client, deviceId, app, path);
}

function validateAppName(app: string): void {
  if (!app.match(allowedAppNameRegex)) {
    throw new Error(`Disallowed run-as user: ${app}`);
  }
}

function validateFilePath(filePath: string): void {
  if (filePath.match(/[']/)) {
    throw new Error(`Disallowed escaping filepath: ${filePath}`);
  }
}

function validateFileContent(content: string): void {
  if (content.match(/["]/)) {
    throw new Error(`Disallowed escaping file content: ${content}`);
  }
}

enum RunAsErrorCode {
  NotAnApp = 1,
  NotDebuggable = 2,
  PermissionDenied = 3,
}

class RunAsError extends Error {
  code: RunAsErrorCode;

  constructor(code: RunAsErrorCode, message?: string) {
    super(message);
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

function _push(
  deviceClient: DeviceClient,
  deviceId: string,
  app: AppName,
  filename: FilePath,
  contents: FileContent,
): Promise<void> {
  console.debug(`Deploying ${filename} to ${deviceId}:${app}`, logTag);
  // TODO: this is sensitive to escaping issues, can we leverage client.push instead?
  // https://www.npmjs.com/package/adbkit#pushing-a-file-to-all-connected-devices
  const command = `echo "${contents}" > '${filename}' && chmod 644 '${filename}'`;
  return executeCommandAsApp(deviceClient, deviceId, app, command)
    .then((_) => undefined)
    .catch((error) => {
      if (error instanceof RunAsError) {
        // Fall back to running the command directly. This will work if adb is running as root.
        executeCommandWithSu(deviceClient, deviceId, app, command, error);
        return undefined;
      }
      throw error;
    });
}

function _pull(
  deviceClient: DeviceClient,
  deviceId: string,
  app: AppName,
  path: FilePath,
): Promise<string> {
  const command = `cat '${path}'`;
  return executeCommandAsApp(deviceClient, deviceId, app, command).catch(
    (error) => {
      if (error instanceof RunAsError) {
        // Fall back to running the command directly. This will work if adb is running as root.
        return executeCommandWithSu(
          deviceClient,
          deviceId,
          app,
          command,
          error,
        );
      }
      throw error;
    },
  );
}

// Keep this method private since it relies on pre-validated arguments
export function executeCommandAsApp(
  client: DeviceClient,
  deviceId: string,
  app: string,
  command: string,
): Promise<string> {
  return _executeCommandWithRunner(
    client,
    deviceId,
    app,
    command,
    `run-as '${app}'`,
  );
}

async function executeCommandWithSu(
  client: DeviceClient,
  deviceId: string,
  app: string,
  command: string,
  originalErrorToThrow: RunAsError,
): Promise<string> {
  try {
    return _executeCommandWithRunner(client, deviceId, app, command, 'su');
  } catch (e) {
    console.debug(e);
    throw originalErrorToThrow;
  }
}

function _executeCommandWithRunner(
  client: DeviceClient,
  deviceId: string,
  app: string,
  command: string,
  runner: string,
): Promise<string> {
  return client
    .shell(`echo '${command}' | ${runner}`)
    .then(adbkit.util.readAll)
    .then((buffer) => buffer.toString())
    .then((output) => {
      if (output.match(appNotApplicationRegex)) {
        throw new RunAsError(
          RunAsErrorCode.NotAnApp,
          `Android package ${app} is not an application. To use it with Flipper, either run adb as root or add an <application> tag to AndroidManifest.xml`,
        );
      }
      if (output.match(appNotDebuggableRegex)) {
        throw new RunAsError(
          RunAsErrorCode.NotDebuggable,
          `Android app ${app} is not debuggable. To use it with Flipper, add android:debuggable="true" to the application section of AndroidManifest.xml`,
        );
      }
      if (output.toLowerCase().match(operationNotPermittedRegex)) {
        throw new UnsupportedError(
          `Your android device (${deviceId}) does not support the adb shell run-as command. We're tracking this at https://github.com/facebook/flipper/issues/92`,
        );
      }
      if (output.toLowerCase().match(permissionDeniedRegex)) {
        throw new RunAsError(
          RunAsErrorCode.PermissionDenied,
          `No permission to run-as application. To use it with Flipper, either run adb as root or allow running as app`,
        );
      }
      return output;
    });
}
