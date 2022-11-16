/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {RemoteServerContext, FlipperLib} from 'flipper-plugin-core';
import {
  BufferEncoding,
  ExecOptions,
  fsConstants,
  Logger,
  MkdirOptions,
  RmOptions,
} from 'flipper-common';
import constants from '../fb-stubs/constants';
import {RenderHost} from '../RenderHost';
import {downloadFileFactory} from './downloadFile';
import {Base64} from 'js-base64';

export function baseFlipperLibImplementation(
  renderHost: RenderHost,
  logger: Logger,
): Omit<
  FlipperLib,
  'enableMenuEntries' | 'selectPlugin' | 'showNotification' | 'createPaste'
> {
  return {
    isFB: !constants.IS_PUBLIC_BUILD,
    logger,
    GK: renderHost.GK,
    writeTextToClipboard: renderHost.writeTextToClipboard,
    openLink: renderHost.openLink,
    importFile: renderHost.importFile,
    exportFile: renderHost.exportFile,
    exportFileBinary: renderHost.exportFileBinary,
    paths: {
      appPath: renderHost.serverConfig.paths.appPath,
      homePath: renderHost.serverConfig.paths.homePath,
      staticPath: renderHost.serverConfig.paths.staticPath,
      tempPath: renderHost.serverConfig.paths.tempPath,
    },
    environmentInfo: {
      os: renderHost.serverConfig.environmentInfo.os,
      env: renderHost.serverConfig.env,
    },
    intern: {
      graphGet: (...args) =>
        renderHost.flipperServer.exec('intern-graph-get', ...args),
      graphPost: (...args) =>
        renderHost.flipperServer.exec('intern-graph-post', ...args),
      isLoggedIn: () => renderHost.flipperServer.exec('is-logged-in'),
    },
    remoteServerContext: {
      childProcess: {
        exec: async (
          command: string,
          options?: ExecOptions & {encoding?: BufferEncoding},
        ) => renderHost.flipperServer.exec('node-api-exec', command, options),
      },
      fs: {
        access: async (path: string, mode?: number) =>
          renderHost.flipperServer.exec('node-api-fs-access', path, mode),
        pathExists: async (path: string, mode?: number) =>
          renderHost.flipperServer.exec('node-api-fs-pathExists', path, mode),
        unlink: async (path: string) =>
          renderHost.flipperServer.exec('node-api-fs-unlink', path),
        mkdir: (async (
          path: string,
          options?: {recursive?: boolean} & MkdirOptions,
        ) =>
          renderHost.flipperServer.exec(
            'node-api-fs-mkdir',
            path,
            options,
          )) as RemoteServerContext['fs']['mkdir'],
        rm: async (path: string, options?: RmOptions) =>
          renderHost.flipperServer.exec('node-api-fs-rm', path, options),
        copyFile: async (src: string, dest: string, flags?: number) =>
          renderHost.flipperServer.exec(
            'node-api-fs-copyFile',
            src,
            dest,
            flags,
          ),
        constants: fsConstants,
        stat: async (path: string) =>
          renderHost.flipperServer.exec('node-api-fs-stat', path),
        readlink: async (path: string) =>
          renderHost.flipperServer.exec('node-api-fs-readlink', path),
        readFile: (path, options) =>
          renderHost.flipperServer.exec('node-api-fs-readfile', path, options),
        readFileBinary: async (path) =>
          Base64.toUint8Array(
            await renderHost.flipperServer.exec(
              'node-api-fs-readfile-binary',
              path,
            ),
          ),
        writeFile: (path, contents, options) =>
          renderHost.flipperServer.exec(
            'node-api-fs-writefile',
            path,
            contents,
            options,
          ),
        writeFileBinary: async (path, contents) => {
          const base64contents = Base64.fromUint8Array(contents);
          return await renderHost.flipperServer.exec(
            'node-api-fs-writefile-binary',
            path,
            base64contents,
          );
        },
      },
      downloadFile: downloadFileFactory(renderHost),
    },
  };
}
