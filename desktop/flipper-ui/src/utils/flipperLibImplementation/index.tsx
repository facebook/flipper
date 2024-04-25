/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  _setFlipperLibImplementation,
  RemoteServerContext,
} from 'flipper-plugin';
import type {Store} from '../../reducers';
import createPaste from '../../fb-stubs/createPaste';
import {DetailSidebarImpl} from '../../sandy-chrome/DetailSidebarImpl';
import {addNotification} from '../../reducers/notifications';
import {deconstructPluginKey} from 'flipper-common';
import {setMenuEntries} from '../../reducers/connections';
import {
  currentUser,
  internGraphGETAPIRequestRaw,
  internGraphPOSTAPIRequestRaw,
  isConnected,
} from '../../fb-stubs/user';
import BaseDevice from '../../devices/BaseDevice';
import {
  BufferEncoding,
  ExecOptions,
  fsConstants,
  Logger,
  MkdirOptions,
  RmOptions,
} from 'flipper-common';
import constants from '../../fb-stubs/constants';
import {downloadFile} from './downloadFile';
import {Base64} from 'js-base64';
import {importFile} from '../importFile';
import {exportFile, exportFileBinary} from '../exportFile';
import {getFlipperServer, getFlipperServerConfig} from '../../flipperServer';
import {GK} from '../GK';

export function initializeFlipperLibImplementation(
  store: Store,
  logger: Logger,
) {
  _setFlipperLibImplementation({
    isFB: !constants.IS_PUBLIC_BUILD,
    logger,
    GK,
    writeTextToClipboard: (text) => navigator.clipboard.writeText(text),
    openLink: (url: string) => window.open(url, '_blank'),
    importFile,
    exportFile,
    exportFileBinary,
    paths: {
      appPath: getFlipperServerConfig().paths.appPath,
      homePath: getFlipperServerConfig().paths.homePath,
      staticPath: getFlipperServerConfig().paths.staticPath,
      tempPath: getFlipperServerConfig().paths.tempPath,
    },
    environmentInfo: {
      os: getFlipperServerConfig().environmentInfo.os,
      env: getFlipperServerConfig().env,
      isHeadlessBuild: true,
    },
    remoteServerContext: {
      childProcess: {
        exec: async (
          command: string,
          options?: ExecOptions & {encoding?: BufferEncoding},
        ) => getFlipperServer().exec('node-api-exec', command, options),
      },
      fs: {
        access: async (path: string, mode?: number) =>
          getFlipperServer().exec('node-api-fs-access', path, mode),
        pathExists: async (path: string, mode?: number) =>
          getFlipperServer().exec('node-api-fs-pathExists', path, mode),
        unlink: async (path: string) =>
          getFlipperServer().exec('node-api-fs-unlink', path),
        mkdir: (async (
          path: string,
          options?: {recursive?: boolean} & MkdirOptions,
        ) =>
          getFlipperServer().exec(
            'node-api-fs-mkdir',
            path,
            options,
          )) as RemoteServerContext['fs']['mkdir'],
        rm: async (path: string, options?: RmOptions) =>
          getFlipperServer().exec('node-api-fs-rm', path, options),
        copyFile: async (src: string, dest: string, flags?: number) =>
          getFlipperServer().exec('node-api-fs-copyFile', src, dest, flags),
        constants: fsConstants,
        stat: async (path: string) =>
          getFlipperServer().exec('node-api-fs-stat', path),
        readlink: async (path: string) =>
          getFlipperServer().exec('node-api-fs-readlink', path),
        readFile: (path, options) =>
          getFlipperServer().exec('node-api-fs-readfile', path, options),
        readFileBinary: async (path) =>
          Base64.toUint8Array(
            await getFlipperServer().exec('node-api-fs-readfile-binary', path),
          ),
        writeFile: (path, contents, options) =>
          getFlipperServer().exec(
            'node-api-fs-writefile',
            path,
            contents,
            options,
          ),
        writeFileBinary: async (path, contents) => {
          const base64contents = Base64.fromUint8Array(contents);
          return await getFlipperServer().exec(
            'node-api-fs-writefile-binary',
            path,
            base64contents,
          );
        },
      },
      downloadFile,
    },
    intern: {
      graphGet: internGraphGETAPIRequestRaw,
      graphPost: internGraphPOSTAPIRequestRaw,
      currentUser,
      isConnected,
      isLoggedIn: () => getFlipperServer().exec('is-logged-in'),
    },
    runDeviceAction(cmd, ...params) {
      if (!(cmd.startsWith('ios-') || cmd.startsWith('android-'))) {
        throw new Error(`Unsupported device action "${cmd}"`);
      }

      return getFlipperServer().exec(cmd, ...params);
    },
    enableMenuEntries(entries) {
      store.dispatch(setMenuEntries(entries));
    },
    createPaste,
    selectPlugin(device, client, pluginId, deeplink) {
      store.dispatch({
        type: 'SELECT_PLUGIN',
        payload: {
          selectedPlugin: pluginId,
          selectedDevice: device as BaseDevice,
          selectedAppId: client ? client.id : null,
          deepLinkPayload: deeplink,
          time: Date.now(),
        },
      });
    },
    showNotification(pluginId, notification) {
      const parts = deconstructPluginKey(pluginId);
      store.dispatch(
        addNotification({
          pluginId: parts.pluginName,
          client: parts.client,
          notification,
        }),
      );
    },
    DetailsSidebarImplementation: DetailSidebarImpl,
    settings() {
      const darkModeState = store.getState().settingsState.darkMode;
      let isDarkMode = darkModeState === 'dark';
      if (
        darkModeState === 'system' &&
        window.matchMedia('(prefers-color-scheme:dark)').matches
      ) {
        isDarkMode = true;
      }
      return {isDarkMode};
    },
  });
}
