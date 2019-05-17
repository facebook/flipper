/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import {getAdbClient} from './adbClient';
const adbkit = require('adbkit-fb');

const logTag = 'androidContainerUtility';
const appNotDebuggableRegex = /debuggable/;
const allowedAppNameRegex = /^[a-zA-Z0-9._\-]+$/;
const operationNotPermittedRegex = /not permitted/;

const adb = getAdbClient();

export function executeCommandAsApp(
  deviceId: string,
  app: string,
  command: string,
): Promise<string> {
  if (!app.match(allowedAppNameRegex)) {
    return Promise.reject(new Error(`Disallowed run-as user: ${app}`));
  }
  if (command.match(/[']/)) {
    return Promise.reject(new Error(`Disallowed escaping command: ${command}`));
  }
  return adb
    .then(client =>
      client.shell(deviceId, `echo '${command}' | run-as '${app}'`),
    )
    .then(adbkit.util.readAll)
    .then(buffer => buffer.toString())
    .then(output => {
      if (output.match(appNotDebuggableRegex)) {
        throw new Error(
          `Android app ${app} is not debuggable. To use it with Flipper, add android:debuggable="true" to the application section of AndroidManifest.xml`,
        );
      }
      if (output.toLowerCase().match(operationNotPermittedRegex)) {
        throw new Error(
          `Your android device (${deviceId}) does not support the adb shell run-as command. We're tracking this at https://github.com/facebook/flipper/issues/92`,
        );
      }
      return output;
    });
}

export function push(
  deviceId: string,
  app: string,
  filename: string,
  contents: string,
): Promise<void> {
  console.debug(`Deploying ${filename} to ${deviceId}:${app}`, logTag);
  return executeCommandAsApp(
    deviceId,
    app,
    `echo "${contents}" > ${filename} && chmod 600 ${filename}`,
  ).then(output => undefined);
}
