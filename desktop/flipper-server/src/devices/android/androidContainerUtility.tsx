/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {ClientQuery, UnsupportedError} from 'flipper-common';
import adbkit, {Client} from 'adbkit';
import {recorder} from '../../recorder';

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
  adbClient: Client,
  deviceId: string,
  app: string,
  filepath: string,
  contents: string,
  clientQuery?: ClientQuery,
): Promise<void> {
  validateAppName(app);
  validateFilePath(filepath);
  validateFileContent(contents);
  return await _push(adbClient, deviceId, app, filepath, contents, clientQuery);
}

export async function pull(
  adbClient: Client,
  deviceId: string,
  app: string,
  path: string,
  clientQuery?: ClientQuery,
): Promise<string> {
  validateAppName(app);
  validateFilePath(path);
  return await _pull(adbClient, deviceId, app, path, clientQuery);
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

async function _push(
  adbClient: Client,
  deviceId: string,
  app: AppName,
  filename: FilePath,
  contents: FileContent,
  clientQuery?: ClientQuery,
): Promise<void> {
  console.debug(`Deploying ${filename} to ${deviceId}:${app}`, logTag);

  const cmd = `echo "${contents}" > '${filename}' && chmod 644 '${filename}'`;
  const description = 'Push file to device using adb shell (echo / chmod)';
  const troubleshoot =
    'Failed to execute adb command, adb may be unresponsive, try running `adb kill-server` from your terminal';

  const reportSuccess = () => {
    recorder.event('cmd', {
      cmd,
      description,
      troubleshoot,
      success: true,
      context: clientQuery,
    });
  };
  const reportFailure = (error: Error) => {
    recorder.event('cmd', {
      cmd,
      description,
      troubleshoot,
      stdout: error.message,
      success: false,
      context: clientQuery,
    });
  };

  try {
    await executeCommandAsApp(adbClient, deviceId, app, cmd);
    reportSuccess();
  } catch (error) {
    if (error instanceof RunAsError) {
      // Fall back to running the command directly.
      // This will work if adb is running as root.
      try {
        await executeCommandWithSu(adbClient, deviceId, app, cmd, error);
        reportSuccess();
        return;
      } catch (suError) {
        reportFailure(suError);
        throw suError;
      }
    }
    reportFailure(error);
    throw error;
  }
}

async function _pull(
  adbClient: Client,
  deviceId: string,
  app: AppName,
  path: FilePath,
  clientQuery?: ClientQuery,
): Promise<string> {
  const cmd = `cat '${path}'`;
  const description = 'Pull file from device using adb shell (cat)';
  const troubleshoot =
    'Failed to execute adb command, adb may be unresponsive, try running `adb kill-server` from your terminal';

  const reportSuccess = () => {
    recorder.event('cmd', {
      cmd,
      description,
      troubleshoot,
      success: true,
      context: clientQuery,
    });
  };
  const reportFailure = (error: Error) => {
    recorder.event('cmd', {
      cmd,
      description,
      troubleshoot,
      stdout: error.message,
      success: false,
      context: clientQuery,
    });
  };

  try {
    const content = await executeCommandAsApp(adbClient, deviceId, app, cmd);
    reportSuccess();
    return content;
  } catch (error) {
    if (error instanceof RunAsError) {
      // Fall back to running the command directly.
      // This will work if adb is running as root.
      try {
        const content = await executeCommandWithSu(
          adbClient,
          deviceId,
          app,
          cmd,
          error,
        );
        reportSuccess();
        return content;
      } catch (suError) {
        reportFailure(suError);
        throw suError;
      }
    }
    reportFailure(error);
    throw error;
  }
}

// Keep this method private since it relies on pre-validated arguments
export function executeCommandAsApp(
  adbClient: Client,
  deviceId: string,
  app: string,
  command: string,
): Promise<string> {
  return _executeCommandWithRunner(
    adbClient,
    deviceId,
    app,
    command,
    `run-as '${app}'`,
  );
}

async function executeCommandWithSu(
  adbClient: Client,
  deviceId: string,
  app: string,
  command: string,
  originalErrorToThrow: RunAsError,
): Promise<string> {
  try {
    return _executeCommandWithRunner(adbClient, deviceId, app, command, 'su');
  } catch (e) {
    throw originalErrorToThrow;
  }
}

function _executeCommandWithRunner(
  adbClient: Client,
  deviceId: string,
  app: string,
  command: string,
  runner: string,
): Promise<string> {
  return adbClient
    .shell(deviceId, `echo '${command}' | ${runner}`)
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
